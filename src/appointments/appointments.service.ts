import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppError } from '../common/errors/app-error';
import { paginate, PaginatedResult } from '../common/pagination/paginate';
import { timeToMinutes } from '../common/time-of-day';
import { DoctorsService } from '../doctors/doctors.service';
import { PatientsService } from '../patients/patients.service';
import { WorkScheduleRepository } from '../work-schedule/work-schedule.repository';
import { AppointmentsRepository, AppointmentFilter } from './appointments.repository';
import { Appointment, AppointmentStatus } from './entities/appointment.entity';
import { Doctor } from '../doctors/entities/doctor.entity';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { AppointmentResponseDto } from './dto/appointment-response.dto';
import { AuthUser } from '../auth/dto/jwt-payload';

/**
 * RN11/RN12 - maquina de estados das transicoes de status. A chave e o
 * status atual; o valor e o conjunto de status para os quais ele pode
 * transicionar. Qualquer transicao fora dessa tabela e TRANSICAO_INVALIDA.
 */
const ALLOWED_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  scheduled: ['in_progress', 'cancelled'],
  in_progress: ['done', 'cancelled'],
  done: [],
  cancelled: [],
};

/**
 * RN12 - quem tem autoridade para aplicar cada transicao. "admin" e
 * "secretary" podem cancelar qualquer agendamento (reorganizacao de
 * agenda); somente o proprio medico pode iniciar/concluir o atendimento.
 */
function canApplyTransition(
  user: AuthUser,
  from: AppointmentStatus,
  to: AppointmentStatus,
  appointmentDoctorUserId: number,
): boolean {
  if (to === 'cancelled') {
    return (
      user.roles.includes('admin') ||
      user.roles.includes('secretary') ||
      (user.roles.includes('doctor') && user.id === appointmentDoctorUserId)
    );
  }
  if (to === 'in_progress' || to === 'done') {
    return user.roles.includes('doctor') && user.id === appointmentDoctorUserId;
  }
  return false;
}

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly appointmentsRepository: AppointmentsRepository,
    private readonly workScheduleRepository: WorkScheduleRepository,
    private readonly doctorsService: DoctorsService,
    private readonly patientsService: PatientsService,
  ) {}

  /**
   * RF06/RF07 - cria um agendamento. Ordem fixa de validacoes (RN07-RN10):
   *   1. medico e paciente existem;
   *   2. horario cai dentro de algum turno da escala do medico;
   *   3. horario esta alinhado ao grid de slots daquele turno;
   *   4. a consulta (start + duracao do slot) cabe inteira dentro do turno;
   *   5. medico nao tem outro agendamento ativo que conflite (RN10, com
   *      lock pessimista para evitar corrida);
   *   6. paciente nao tem outro agendamento ativo que conflite.
   */
  async create(dto: CreateAppointmentDto): Promise<AppointmentResponseDto> {
    const startsAt = new Date(dto.startsAt);
    if (Number.isNaN(startsAt.getTime())) {
      throw new AppError('DADOS_INVALIDOS', 'startsAt invalido.');
    }

    await this.doctorsService.getOrFail(dto.doctorId);
    await this.patientsService.getOrFail(dto.patientId);

    const shifts = await this.workScheduleRepository.findByDoctorId(dto.doctorId);
    // Dia da semana e minutos do dia sao calculados em UTC, de proposito:
    // startsAt chega como timestamptz (RP05) e a escala (work_shift) nao
    // guarda fuso horario, entao fixar UTC como referencia unica evita
    // ambiguidade entre o fuso do servidor e o fuso do cliente.
    const weekDay = startsAt.getUTCDay();
    const minutesOfDay = startsAt.getUTCHours() * 60 + startsAt.getUTCMinutes();

    const shift = shifts.find((s) => {
      if (s.weekDay !== weekDay) return false;
      const shiftStart = timeToMinutes(s.startTime);
      const shiftEnd = timeToMinutes(s.endTime);
      return minutesOfDay >= shiftStart && minutesOfDay < shiftEnd;
    });

    if (!shift) {
      throw new AppError(
        'HORARIO_FORA_DA_ESCALA',
        'O horario informado nao esta dentro da escala de trabalho do medico.',
      );
    }

    const shiftStart = timeToMinutes(shift.startTime);
    const shiftEnd = timeToMinutes(shift.endTime);
    const offsetFromShiftStart = minutesOfDay - shiftStart;

    if (offsetFromShiftStart % shift.slotDurationMinutes !== 0) {
      throw new AppError(
        'HORARIO_FORA_DA_ESCALA',
        'O horario informado nao esta alinhado com os slots do turno.',
      );
    }

    const endsAt = new Date(startsAt.getTime() + shift.slotDurationMinutes * 60_000);
    const minutesOfDayEnd = minutesOfDay + shift.slotDurationMinutes;
    if (minutesOfDayEnd > shiftEnd) {
      throw new AppError(
        'HORARIO_FORA_DA_ESCALA',
        'A duracao do slot ultrapassa o fim do turno.',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      // RF07/RN10 - trava a linha do medico para serializar criacoes
      // concorrentes de agendamento para o mesmo medico; sem isso, duas
      // requisicoes simultaneas poderiam passar a checagem de conflito
      // ao mesmo tempo e gravar horarios sobrepostos.
      await manager
        .createQueryBuilder(Doctor, 'doctor')
        .setLock('pessimistic_write')
        .where('doctor.id = :id', { id: dto.doctorId })
        .getOne();

      const appointmentRepo = manager.getRepository(Appointment);

      const doctorConflicts = await appointmentRepo
        .createQueryBuilder('appointment')
        .where('appointment.status IN (:...statuses)', {
          statuses: ['scheduled', 'in_progress', 'done'],
        })
        .andWhere('appointment.doctor_id = :doctorId', { doctorId: dto.doctorId })
        .andWhere('appointment.starts_at < :endsAt', { endsAt })
        .andWhere('appointment.ends_at > :startsAt', { startsAt })
        .getMany();

      if (doctorConflicts.length > 0) {
        throw new AppError(
          'HORARIO_INDISPONIVEL',
          'O medico ja possui um agendamento nesse horario.',
        );
      }

      const patientConflicts = await appointmentRepo
        .createQueryBuilder('appointment')
        .where('appointment.status IN (:...statuses)', {
          statuses: ['scheduled', 'in_progress', 'done'],
        })
        .andWhere('appointment.patient_id = :patientId', { patientId: dto.patientId })
        .andWhere('appointment.starts_at < :endsAt', { endsAt })
        .andWhere('appointment.ends_at > :startsAt', { startsAt })
        .getMany();

      if (patientConflicts.length > 0) {
        throw new AppError(
          'PACIENTE_INDISPONIVEL',
          'O paciente ja possui outro agendamento nesse horario.',
        );
      }

      const appointment = appointmentRepo.create({
        doctorId: dto.doctorId,
        patientId: dto.patientId,
        startsAt,
        endsAt,
        status: 'scheduled',
      });
      const saved = await appointmentRepo.save(appointment);
      return this.toResponseDto(saved);
    });
  }

  async list(
    filter: AppointmentFilter,
    page: number,
    pageSize: number,
  ): Promise<PaginatedResult<AppointmentResponseDto>> {
    const [items, total] = await this.appointmentsRepository.listFiltered(
      filter,
      page,
      pageSize,
    );
    return paginate(items.map((a) => this.toResponseDto(a)), total, page, pageSize);
  }

  async findById(id: number): Promise<Appointment> {
    const appointment = await this.appointmentsRepository.findOneBy({ id });
    if (!appointment) {
      throw new AppError('RECURSO_NAO_ENCONTRADO', 'Agendamento nao encontrado.');
    }
    return appointment;
  }

  /**
   * RN11/RN12 - aplica uma transicao de status, validando tanto se ela e
   * permitida pela maquina de estados quanto se o usuario autenticado tem
   * autoridade para aplica-la.
   */
  async updateStatus(
    id: number,
    newStatus: AppointmentStatus,
    user: AuthUser,
  ): Promise<AppointmentResponseDto> {
    const appointment = await this.findById(id);
    const doctor = await this.doctorsService.getOrFail(appointment.doctorId);

    const allowed = ALLOWED_TRANSITIONS[appointment.status];
    if (!allowed.includes(newStatus)) {
      throw new AppError(
        'TRANSICAO_INVALIDA',
        `Nao e possivel mudar de "${appointment.status}" para "${newStatus}".`,
      );
    }

    if (!canApplyTransition(user, appointment.status, newStatus, doctor.userId)) {
      throw new AppError(
        'ACESSO_NEGADO',
        'Voce nao tem permissao para aplicar esta transicao de status.',
      );
    }

    appointment.status = newStatus;
    const saved = await this.appointmentsRepository.save(appointment);
    return this.toResponseDto(saved);
  }

  private toResponseDto(appointment: Appointment): AppointmentResponseDto {
    return {
      id: appointment.id,
      doctorId: appointment.doctorId,
      patientId: appointment.patientId,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      status: appointment.status,
      createdAt: appointment.createdAt,
    };
  }
}

import { Injectable } from '@nestjs/common';
import { AppError } from '../common/errors/app-error';
import { DoctorsService } from '../doctors/doctors.service';
import { WorkScheduleRepository } from '../work-schedule/work-schedule.repository';
import { AppointmentsRepository } from '../appointments/appointments.repository';

const MAX_RANGE_DAYS = 31;

@Injectable()
export class CalendarService {
  constructor(
    private readonly doctorsService: DoctorsService,
    private readonly workScheduleRepository: WorkScheduleRepository,
    private readonly appointmentsRepository: AppointmentsRepository,
  ) {}

  /**
   * RF05 - devolve a escala de trabalho do medico junto com os
   * agendamentos ativos no periodo pedido. NAO gera "slots livres"
   * calculados (secao 4.9.6 do contrato e explicita: a geracao de
   * horarios disponiveis fica a cargo do cliente da API, a partir da
   * escala + dos agendamentos ja ocupados).
   */
  async getCalendar(doctorId: number, fromRaw: string, toRaw: string) {
    await this.doctorsService.getOrFail(doctorId);

    const from = new Date(fromRaw);
    const to = new Date(toRaw);

    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      throw new AppError('DADOS_INVALIDOS', 'Parametros from/to invalidos.');
    }
    if (from > to) {
      throw new AppError(
        'DADOS_INVALIDOS',
        'O parametro "from" deve ser anterior a "to".',
      );
    }

    const rangeDays = (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24);
    if (rangeDays > MAX_RANGE_DAYS) {
      throw new AppError(
        'DADOS_INVALIDOS',
        `O intervalo entre "from" e "to" nao pode ultrapassar ${MAX_RANGE_DAYS} dias.`,
      );
    }

    const [shifts, appointments] = await Promise.all([
      this.workScheduleRepository.findByDoctorId(doctorId),
      this.appointmentsRepository.findInRange(doctorId, from, to),
    ]);

    return {
      doctorId,
      from: from.toISOString(),
      to: to.toISOString(),
      workSchedule: shifts.map((s) => ({
        weekDay: s.weekDay,
        startTime: s.startTime,
        endTime: s.endTime,
        slotDurationMinutes: s.slotDurationMinutes,
      })),
      appointments: appointments.map((a) => ({
        id: a.id,
        patientId: a.patientId,
        startsAt: a.startsAt,
        endsAt: a.endsAt,
        status: a.status,
      })),
    };
  }
}

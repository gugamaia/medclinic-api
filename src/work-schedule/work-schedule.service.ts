import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppError } from '../common/errors/app-error';
import { rangesOverlap, timeToMinutes } from '../common/time-of-day';
import { DoctorsService } from '../doctors/doctors.service';
import { ShiftDto } from './dto/shift.dto';
import { WorkScheduleResponseDto } from './dto/shift-response.dto';
import { WorkScheduleRepository } from './work-schedule.repository';
import { WorkShift } from './entities/work-shift.entity';

/**
 * RN05 - dentro do mesmo dia da semana, nenhum turno pode se sobrepor a
 * outro (turnos que apenas se tocam, ex. 08:00-12:00 e 12:00-18:00, sao
 * validos). Funcao pura, testavel em unidade sem banco de dados.
 *
 * Tambem valida (implicito no contrato) que startTime < endTime, pois um
 * turno com duracao zero ou negativa nunca caberia nenhum slot.
 */
export function findShiftConflict(shifts: ShiftDto[]): string | null {
  for (const shift of shifts) {
    if (timeToMinutes(shift.startTime) >= timeToMinutes(shift.endTime)) {
      return `Turno invalido: horario de inicio deve ser antes do horario de fim (dia ${shift.weekDay}, ${shift.startTime}-${shift.endTime}).`;
    }
  }

  for (let i = 0; i < shifts.length; i += 1) {
    for (let j = i + 1; j < shifts.length; j += 1) {
      const a = shifts[i];
      const b = shifts[j];
      if (a.weekDay !== b.weekDay) continue;

      const overlap = rangesOverlap(
        timeToMinutes(a.startTime),
        timeToMinutes(a.endTime),
        timeToMinutes(b.startTime),
        timeToMinutes(b.endTime),
      );
      if (overlap) {
        return `Turnos sobrepostos no dia ${a.weekDay}: ${a.startTime}-${a.endTime} conflita com ${b.startTime}-${b.endTime}.`;
      }
    }
  }

  return null;
}

@Injectable()
export class WorkScheduleService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly workScheduleRepository: WorkScheduleRepository,
    private readonly doctorsService: DoctorsService,
  ) {}

  async findByDoctorId(doctorId: number): Promise<WorkScheduleResponseDto> {
    await this.doctorsService.getOrFail(doctorId);
    const shifts = await this.workScheduleRepository.findByDoctorId(doctorId);
    return this.toResponseDto(doctorId, shifts);
  }

  /**
   * RF04/RN15 - substitui a escala inteira do medico de uma vez so.
   * Roda em transacao: apaga todos os turnos antigos e insere os novos
   * atomicamente (ou tudo ou nada). Agendamentos ja existentes NAO sao
   * alterados por essa troca (RN15 - a duracao de um agendamento ja
   * criado fica congelada no proprio registro de Appointment).
   */
  async replace(
    doctorId: number,
    shifts: ShiftDto[],
  ): Promise<WorkScheduleResponseDto> {
    await this.doctorsService.getOrFail(doctorId);

    const conflict = findShiftConflict(shifts);
    if (conflict) {
      throw new AppError('DADOS_INVALIDOS', conflict);
    }

    const saved = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(WorkShift);
      await repo.delete({ doctorId });

      const entities = shifts.map((shift) =>
        repo.create({
          doctorId,
          weekDay: shift.weekDay,
          startTime: shift.startTime,
          endTime: shift.endTime,
          slotDurationMinutes: shift.slotDurationMinutes,
        }),
      );
      return repo.save(entities);
    });

    return this.toResponseDto(doctorId, saved);
  }

  private toResponseDto(
    doctorId: number,
    shifts: WorkShift[],
  ): WorkScheduleResponseDto {
    return {
      doctorId,
      shifts: shifts
        .slice()
        .sort((a, b) => a.weekDay - b.weekDay || a.startTime.localeCompare(b.startTime))
        .map((s) => ({
          weekDay: s.weekDay,
          startTime: s.startTime,
          endTime: s.endTime,
          slotDurationMinutes: s.slotDurationMinutes,
        })),
    };
  }
}

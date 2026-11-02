import { IsInt, IsISO8601, Min } from 'class-validator';

/**
 * RF06 - criacao de agendamento. O cliente informa doctorId, patientId e
 * o horario de inicio; a duracao (e portanto startsAt/endsAt) vem da
 * duracao de slot configurada na escala do medico (RN07).
 */
export class CreateAppointmentDto {
  @IsInt()
  @Min(1)
  doctorId: number;

  @IsInt()
  @Min(1)
  patientId: number;

  /** Data/hora de inicio em ISO-8601 (ex.: "2026-03-10T14:00:00.000Z"). */
  @IsISO8601()
  startsAt: string;
}

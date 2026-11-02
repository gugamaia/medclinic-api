/** Formato de um turno devolvido pela API (mesmo shape do corpo enviado). */
export class ShiftResponseDto {
  weekDay: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
}

export class WorkScheduleResponseDto {
  doctorId: number;
  shifts: ShiftResponseDto[];
}

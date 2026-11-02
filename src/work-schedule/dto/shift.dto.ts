import { IsInt, IsPositive, Matches, Max, Min } from 'class-validator';

const HH_MM_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class ShiftDto {
  @IsInt()
  @Min(0)
  @Max(6)
  weekDay: number;

  @Matches(HH_MM_PATTERN, { message: 'startTime deve estar no formato HH:MM' })
  startTime: string;

  @Matches(HH_MM_PATTERN, { message: 'endTime deve estar no formato HH:MM' })
  endTime: string;

  @IsInt()
  @IsPositive()
  slotDurationMinutes: number;
}

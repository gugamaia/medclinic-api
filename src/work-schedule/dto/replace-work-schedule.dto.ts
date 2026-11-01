import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ShiftDto } from './shift.dto';

/**
 * Corpo do PUT /doctors/:doctorId/work-schedule (secao 4.9.5 do contrato).
 * A escala inteira e substituida de uma vez (nunca ha PATCH incremental de
 * turno isolado) - por isso o payload e sempre a lista completa.
 */
export class ReplaceWorkScheduleDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ShiftDto)
  shifts: ShiftDto[];
}

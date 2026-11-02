import { IsIn, IsInt, IsOptional, Matches, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationQueryDto } from '../../common/pagination/pagination-query.dto';
import {
  APPOINTMENT_STATUSES,
  AppointmentStatus,
} from '../entities/appointment.entity';

/**
 * GET /appointments - filtros opcionais. doctorId e forcado/ignorado pelo
 * controller quando quem pede e o proprio medico (RN13 - medico so ve os
 * proprios agendamentos), entao aqui ele e apenas "opcional" do ponto de
 * vista de validacao de payload.
 */
export class QueryAppointmentsDto extends PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  doctorId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  patientId?: number;

  @IsOptional()
  @IsIn(APPOINTMENT_STATUSES)
  status?: AppointmentStatus;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  from?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  to?: string;
}

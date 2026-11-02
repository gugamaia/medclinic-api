import { IsIn } from 'class-validator';
import {
  APPOINTMENT_STATUSES,
  AppointmentStatus,
} from '../entities/appointment.entity';

export class UpdateAppointmentStatusDto {
  @IsIn(APPOINTMENT_STATUSES)
  status: AppointmentStatus;
}

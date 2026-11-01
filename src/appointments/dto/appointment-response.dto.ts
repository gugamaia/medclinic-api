import { AppointmentStatus } from '../entities/appointment.entity';

export class AppointmentResponseDto {
  id: number;
  doctorId: number;
  patientId: number;
  startsAt: Date;
  endsAt: Date;
  status: AppointmentStatus;
  createdAt: Date;
}

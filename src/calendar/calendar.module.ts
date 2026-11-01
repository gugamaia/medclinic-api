import { Module } from '@nestjs/common';
import { CalendarController } from './calendar.controller';
import { CalendarService } from './calendar.service';
import { DoctorsModule } from '../doctors/doctors.module';
import { WorkScheduleModule } from '../work-schedule/work-schedule.module';
import { AppointmentsModule } from '../appointments/appointments.module';

@Module({
  imports: [DoctorsModule, WorkScheduleModule, AppointmentsModule],
  controllers: [CalendarController],
  providers: [CalendarService],
})
export class CalendarModule {}

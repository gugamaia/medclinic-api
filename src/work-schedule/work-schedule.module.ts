import { Module } from '@nestjs/common';
import { WorkScheduleController } from './work-schedule.controller';
import { WorkScheduleService } from './work-schedule.service';
import { WorkScheduleRepository } from './work-schedule.repository';
import { DoctorsModule } from '../doctors/doctors.module';

@Module({
  imports: [DoctorsModule],
  controllers: [WorkScheduleController],
  providers: [WorkScheduleService, WorkScheduleRepository],
  exports: [WorkScheduleService, WorkScheduleRepository],
})
export class WorkScheduleModule {}

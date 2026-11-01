import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { WorkShift } from './entities/work-shift.entity';

@Injectable()
export class WorkScheduleRepository extends Repository<WorkShift> {
  constructor(private readonly dataSource: DataSource) {
    super(WorkShift, dataSource.manager);
  }

  findByDoctorId(doctorId: number): Promise<WorkShift[]> {
    return this.find({
      where: { doctorId },
      order: { weekDay: 'ASC', startTime: 'ASC' },
    });
  }
}

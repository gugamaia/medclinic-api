import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { MedicalRecord } from './entities/medical-record.entity';

@Injectable()
export class MedicalRecordsRepository extends Repository<MedicalRecord> {
  constructor(private readonly dataSource: DataSource) {
    super(MedicalRecord, dataSource.manager);
  }

  async listByPatient(
    patientId: number,
    page: number,
    pageSize: number,
  ): Promise<[MedicalRecord[], number]> {
    return this.findAndCount({
      where: { patientId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }
}

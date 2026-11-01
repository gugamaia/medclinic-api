import { Injectable } from '@nestjs/common';
import { DataSource, ILike, Repository } from 'typeorm';
import { Patient } from './entities/patient.entity';

@Injectable()
export class PatientsRepository extends Repository<Patient> {
  constructor(private readonly dataSource: DataSource) {
    super(Patient, dataSource.manager);
  }

  findByCpf(cpf: string): Promise<Patient | null> {
    return this.findOneBy({ cpf });
  }

  async listPaginated(
    page: number,
    pageSize: number,
    name?: string,
  ): Promise<[Patient[], number]> {
    return this.findAndCount({
      where: name ? { name: ILike(`%${name}%`) } : {},
      order: { id: 'ASC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
  }
}

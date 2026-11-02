import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Doctor } from './entities/doctor.entity';

@Injectable()
export class DoctorsRepository extends Repository<Doctor> {
  constructor(private readonly dataSource: DataSource) {
    super(Doctor, dataSource.manager);
  }

  findByCrm(crm: string): Promise<Doctor | null> {
    return this.findOneBy({ crm });
  }

  findByIdWithUser(id: number): Promise<Doctor | null> {
    return this.findOne({ where: { id }, relations: { user: true } });
  }

  /** Usado para resolver o Doctor correspondente ao usuario autenticado. */
  findByUserId(userId: number): Promise<Doctor | null> {
    return this.findOneBy({ userId });
  }

  async listPaginated(
    page: number,
    pageSize: number,
    name?: string,
  ): Promise<[Doctor[], number]> {
    const qb = this.createQueryBuilder('doctor')
      .leftJoinAndSelect('doctor.user', 'user')
      .orderBy('doctor.id', 'ASC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    if (name) {
      qb.andWhere('user.name ILIKE :name', { name: `%${name}%` });
    }

    return qb.getManyAndCount();
  }
}

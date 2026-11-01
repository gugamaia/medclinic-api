import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { Appointment, AppointmentStatus } from './entities/appointment.entity';

export interface AppointmentFilter {
  doctorId?: number;
  patientId?: number;
  status?: AppointmentStatus;
  from?: Date;
  to?: Date;
}

/** Status que ainda "ocupam" a agenda ao checar conflito (RN09). */
const ACTIVE_STATUSES: AppointmentStatus[] = ['scheduled', 'in_progress', 'done'];

@Injectable()
export class AppointmentsRepository extends Repository<Appointment> {
  constructor(private readonly dataSource: DataSource) {
    super(Appointment, dataSource.manager);
  }

  /**
   * RN09 - busca agendamentos ativos (nao cancelados) de um medico ou
   * paciente que tenham qualquer intersecao com o intervalo informado.
   * Usado tanto na validacao de conflito quanto na agenda (calendar).
   */
  async findActiveOverlapping(params: {
    doctorId?: number;
    patientId?: number;
    startsAt: Date;
    endsAt: Date;
    excludeId?: number;
  }): Promise<Appointment[]> {
    const qb = this.createQueryBuilder('appointment')
      .where('appointment.status IN (:...statuses)', { statuses: ACTIVE_STATUSES })
      .andWhere('appointment.starts_at < :endsAt', { endsAt: params.endsAt })
      .andWhere('appointment.ends_at > :startsAt', { startsAt: params.startsAt });

    if (params.doctorId !== undefined) {
      qb.andWhere('appointment.doctor_id = :doctorId', { doctorId: params.doctorId });
    }
    if (params.patientId !== undefined) {
      qb.andWhere('appointment.patient_id = :patientId', { patientId: params.patientId });
    }
    if (params.excludeId !== undefined) {
      qb.andWhere('appointment.id != :excludeId', { excludeId: params.excludeId });
    }

    return qb.getMany();
  }

  async findInRange(
    doctorId: number,
    from: Date,
    to: Date,
  ): Promise<Appointment[]> {
    return this.createQueryBuilder('appointment')
      .where('appointment.doctor_id = :doctorId', { doctorId })
      .andWhere('appointment.status IN (:...statuses)', { statuses: ACTIVE_STATUSES })
      .andWhere('appointment.starts_at < :to', { to })
      .andWhere('appointment.ends_at > :from', { from })
      .orderBy('appointment.starts_at', 'ASC')
      .getMany();
  }

  async listFiltered(
    filter: AppointmentFilter,
    page: number,
    pageSize: number,
  ): Promise<[Appointment[], number]> {
    const qb = this.createQueryBuilder('appointment')
      .orderBy('appointment.starts_at', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    if (filter.doctorId !== undefined) {
      qb.andWhere('appointment.doctor_id = :doctorId', { doctorId: filter.doctorId });
    }
    if (filter.patientId !== undefined) {
      qb.andWhere('appointment.patient_id = :patientId', { patientId: filter.patientId });
    }
    if (filter.status) {
      qb.andWhere('appointment.status = :status', { status: filter.status });
    }
    if (filter.from) {
      qb.andWhere('appointment.starts_at >= :from', { from: filter.from });
    }
    if (filter.to) {
      qb.andWhere('appointment.starts_at <= :to', { to: filter.to });
    }

    return qb.getManyAndCount();
  }

  /**
   * RF07/RN10 - verifica se o medico ja tem um agendamento que conflita
   * com o paciente informado para outro agendamento (usado para checagem
   * de "o mesmo paciente nao pode ter dois agendamentos no mesmo
   * horario", independente do medico).
   */
  async findPatientOverlapAnyDoctor(
    patientId: number,
    startsAt: Date,
    endsAt: Date,
  ): Promise<Appointment[]> {
    return this.findActiveOverlapping({ patientId, startsAt, endsAt });
  }
}

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export const APPOINTMENT_STATUSES = [
  'scheduled',
  'in_progress',
  'done',
  'cancelled',
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

@Entity()
@Index(['doctorId', 'startsAt'])
@Index(['patientId', 'startsAt'])
export class Appointment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  doctorId: number;

  @Column()
  patientId: number;

  // RP05 - instante guardado com fuso (timestamptz). RN15 - o fim e
  // GRAVADO no momento do agendamento (nao recalculado na leitura), para
  // que uma mudanca futura na escala do medico nao altere retroativamente
  // a duracao de uma consulta ja marcada.
  @Column('timestamptz')
  startsAt: Date;

  @Column('timestamptz')
  endsAt: Date;

  @Column('varchar', { length: 20, default: 'scheduled' })
  status: AppointmentStatus;

  @CreateDateColumn()
  createdAt: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * RF04 - um turno de trabalho de um medico em um dia da semana.
 *
 * startTime/endTime sao guardados como texto "HH:MM" (nao como o tipo
 * `time` do Postgres): evita pegadinhas de fuso horario, e trivial de
 * comparar em memoria (convertendo para minutos) e torna a regra de
 * sobreposicao (RN05) testavel em unidade sem tocar no banco.
 */
@Entity('work_shift')
@Index('idx_work_shift_doctor_id', ['doctorId'])
export class WorkShift {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'doctor_id' })
  doctorId: number;

  /** 0 = domingo ... 6 = sabado. */
  @Column({ name: 'week_day', type: 'smallint' })
  weekDay: number;

  @Column({ name: 'start_time', type: 'varchar', length: 5 })
  startTime: string;

  @Column({ name: 'end_time', type: 'varchar', length: 5 })
  endTime: string;

  @Column({ name: 'slot_duration_minutes', type: 'int' })
  slotDurationMinutes: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}

import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
@Index(['patientId', 'createdAt'])
export class MedicalRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  patientId: number;

  // RF09 - o autor do registro e SEMPRE o medico autenticado, obtido do
  // token no controller/service, nunca um id vindo do corpo da requisicao.
  @Column()
  doctorId: number;

  @Column('text')
  text: string;

  @CreateDateColumn()
  createdAt: Date;
}

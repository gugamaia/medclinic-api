import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

@Entity()
export class Doctor {
  @PrimaryGeneratedColumn()
  id: number;

  // RN03 - CRM e unico. RP04 - garantido por restricao no banco.
  @Column('varchar', { length: 30, unique: true })
  crm: string;

  // Todo medico e tambem um usuario do sistema, com perfil "doctor"
  // (RN03). A FK aponta para o usuario de acesso correspondente.
  @Column()
  userId: number;

  @OneToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}

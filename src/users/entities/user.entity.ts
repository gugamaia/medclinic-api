import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export const ROLE_NAMES = ['admin', 'atendente', 'medico'] as const;
export type RoleName = (typeof ROLE_NAMES)[number];

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('varchar', { length: 150 })
  name: string;

  @Column('varchar', { length: 150, unique: true })
  email: string;

  @Column('varchar', { length: 255, select: false })
  password: string;

  @Column('varchar', { default: 'atendente' })
  role: RoleName;

  @CreateDateColumn()
  createdAt: Date;
}

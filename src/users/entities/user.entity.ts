import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export const ROLE_NAMES = ['admin', 'secretary', 'doctor'] as const;
export type RoleName = (typeof ROLE_NAMES)[number];

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 150 })
  name: string;

  @Column('varchar', { length: 150, unique: true })
  email: string;

  // select: false -> nunca vem numa consulta comum, so quando pedido
  // explicitamente (ver UsersRepository.findForAuthentication). Isso e
  // uma segunda camada de protecao, alem do DTO de resposta, contra o
  // campo "password" vazar em qualquer rota (RNF01).
  @Column('varchar', { length: 255, select: false })
  password: string;

  @Column('text', { array: true })
  roles: RoleName[];

  @CreateDateColumn()
  createdAt: Date;
}

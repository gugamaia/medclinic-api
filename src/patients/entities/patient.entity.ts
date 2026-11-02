import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Patient {
  @PrimaryGeneratedColumn()
  id: number;

  @Column('varchar', { length: 150 })
  name: string;

  // RN02 - CPF e identificador unico do paciente, 11 digitos numericos.
  // RP04 - a unicidade e garantida por restricao no banco (unique: true),
  // nao so por verificacao em codigo.
  @Column('varchar', { length: 11, unique: true })
  cpf: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Remocao logica (RF02 "remove"): paciente apagado deixa de aparecer
  // nas listagens e buscas por id, mas a linha continua no banco.
  @DeleteDateColumn()
  deletedAt: Date | null;
}

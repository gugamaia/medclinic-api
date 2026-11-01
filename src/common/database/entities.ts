import { User } from '../../users/entities/user.entity';

/**
 * Lista central de entidades. Tanto o DataSource da aplicacao quanto o
 * CLI de migrations importam esta mesma lista, para nunca ficarem
 * dessincronizados.
 */
export const ENTITIES = [
  User,
];

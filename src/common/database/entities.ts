<<<<<<< Updated upstream
=======
import { User } from '../../users/entities/user.entity';
import { Patient } from '../../patients/entities/patient.entity';
import { Doctor } from '../../doctors/entities/doctor.entity';

>>>>>>> Stashed changes
/**
 * Lista central de entidades. Tanto o DataSource da aplicacao quanto o
 * CLI de migrations importam esta mesma lista, para nunca ficarem
 * dessincronizados. Comeca vazia - cada modulo de dominio adiciona sua
 * propria entidade aqui conforme e criado.
 */
<<<<<<< Updated upstream
export const ENTITIES: Function[] = [];
=======
export const ENTITIES = [
  User,
  Patient,
  Doctor,
];
>>>>>>> Stashed changes

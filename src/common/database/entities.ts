import { User } from '../../users/entities/user.entity';
import { Patient } from '../../patients/entities/patient.entity';
import { Doctor } from '../../doctors/entities/doctor.entity';
import { WorkShift } from '../../work-schedule/entities/work-shift.entity';

/**
 * Lista central de entidades. Tanto o DataSource da aplicacao quanto o
 * CLI de migrations importam esta mesma lista, para nunca ficarem
 * dessincronizados.
 */
export const ENTITIES = [
  User,
  Patient,
  Doctor,
  WorkShift,
];

import { RoleName } from '../../users/entities/user.entity';

/** O que vai dentro do token, alem dos campos padrao do JWT (exp, iss). */
export interface JwtPayload {
  sub: number;
  roles: RoleName[];
}

/** O que os decorators/guards expoem como "usuario autenticado" na request. */
export interface AuthUser {
  id: number;
  roles: RoleName[];
}

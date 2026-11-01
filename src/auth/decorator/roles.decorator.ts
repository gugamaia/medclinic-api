import { SetMetadata } from '@nestjs/common';
import { RoleName } from '../../users/entities/user.entity';

export const ROLES_KEY = 'requiredRoles';

/**
 * Marca uma rota como exigindo UM dos perfis listados (RN01). Todas as
 * regras de permissao do contrato (Secao 4.9) sao do tipo "perfis admin,
 * secretary" - ou seja, basta UM perfil do usuario bater com UM da lista.
 */
export const Roles = (...roles: RoleName[]) => SetMetadata(ROLES_KEY, roles);

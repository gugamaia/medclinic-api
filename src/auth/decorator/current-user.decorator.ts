import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { AuthUser } from '../dto/jwt-payload';

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole; // Adiciona esta linha se não existir
}

/** Injeta o usuario autenticado (id + roles) direto no parametro do controller. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user as AuthUser;
  },
);

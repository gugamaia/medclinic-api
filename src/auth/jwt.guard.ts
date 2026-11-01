import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PUBLIC_ROUTE_KEY } from './decorator/public-route.decorator';
import { ROLES_KEY } from './decorator/roles.decorator';
import { AuthenticatedRequest } from './decorator/current-user.decorator';
import { JwtService } from './jwt.service';
import { RoleName } from '../users/entities/user.entity';

/**
 * Guard global (registrado como APP_GUARD em app.module.ts), roda em
 * TODA requisicao:
 *   1. se a rota e @PublicRoute(), libera sem checar nada;
 *   2. senao, exige "Authorization: Bearer <token>" valido (RF01);
 *   3. se a rota tem @Roles(...), exige que o usuario tenha pelo menos
 *      um dos perfis listados (RN01).
 */
@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      PUBLIC_ROUTE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);
    const payload = this.jwtService.verify(token);

    request.user = { id: payload.sub, roles: payload.roles };

    const requiredRoles = this.reflector.getAllAndOverride<
      RoleName[] | undefined
    >(ROLES_KEY, [context.getHandler(), context.getClass()]);

    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = requiredRoles.some((role) =>
        payload.roles.includes(role),
      );
      if (!hasRole) {
        throw new ForbiddenException(
          'Voce nao tem permissao para acessar este recurso.',
        );
      }
    }

    return true;
  }

  private extractToken(request: AuthenticatedRequest): string {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Token de autenticacao nao informado.');
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Formato de token invalido.');
    }

    return token;
  }
}

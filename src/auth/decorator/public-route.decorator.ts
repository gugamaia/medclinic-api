import { SetMetadata } from '@nestjs/common';

export const PUBLIC_ROUTE_KEY = 'isPublicRoute';

/** Marca uma rota como publica - o JwtGuard nao exige token nela. */
export const PublicRoute = () => SetMetadata(PUBLIC_ROUTE_KEY, true);

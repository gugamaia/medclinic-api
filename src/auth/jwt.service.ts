import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { APIEnv } from '../env';
import { JwtPayload } from './dto/jwt-payload';

@Injectable()
export class JwtService {
  constructor(private readonly configService: ConfigService<APIEnv>) {}

  sign(payload: JwtPayload): string {
    const secret = this.configService.getOrThrow<string>('JWT_SECRET');
    const expiresIn = this.configService.getOrThrow<string>('JWT_EXPIRES_IN');
    const issuer = this.configService.getOrThrow<string>('JWT_ISSUER');

    return jwt.sign(payload, secret, {
      expiresIn: expiresIn as jwt.SignOptions['expiresIn'],
      issuer,
    });
  }

  verify(token: string): JwtPayload {
    const secret = this.configService.getOrThrow<string>('JWT_SECRET');
    const issuer = this.configService.getOrThrow<string>('JWT_ISSUER');

    try {
      const decoded = jwt.verify(token, secret, { issuer }) as jwt.JwtPayload &
        JwtPayload;
      return { sub: decoded.sub, roles: decoded.roles };
    } catch {
      // Cobre token expirado, assinatura invalida, issuer errado, etc -
      // todos viram a mesma resposta externa (401 NAO_AUTENTICADO), sem
      // vazar detalhe de qual verificacao falhou.
      throw new UnauthorizedException('Token invalido ou expirado.');
    }
  }
}

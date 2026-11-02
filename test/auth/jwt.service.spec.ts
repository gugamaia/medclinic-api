import { describe, expect, it, vi } from 'vitest';
import { JwtService } from '../../src/auth/jwt.service';

function buildConfigService(values: Record<string, string>) {
  return {
    getOrThrow: vi.fn((key: string) => {
      if (!(key in values)) throw new Error(`missing ${key}`);
      return values[key];
    }),
  };
}

describe('JwtService (RF01)', () => {
  const env = {
    JWT_SECRET: 'segredo-de-teste',
    JWT_EXPIRES_IN: '1h',
    JWT_ISSUER: 'medclinic-test',
  };

  it('assina e verifica um token valido, preservando sub e roles', () => {
    const service = new JwtService(buildConfigService(env) as never);
    const token = service.sign({ sub: 7, roles: ['doctor'] });

    const payload = service.verify(token);
    expect(payload.sub).toBe(7);
    expect(payload.roles).toEqual(['doctor']);
  });

  it('rejeita um token com assinatura invalida com uma mensagem generica', () => {
    const service = new JwtService(buildConfigService(env) as never);
    expect(() => service.verify('token.invalido.aqui')).toThrow(
      'Token invalido ou expirado.',
    );
  });

  it('rejeita um token assinado com um issuer diferente', () => {
    const signer = new JwtService(
      buildConfigService({ ...env, JWT_ISSUER: 'outro-issuer' }) as never,
    );
    const token = signer.sign({ sub: 1, roles: ['admin'] });

    const verifier = new JwtService(buildConfigService(env) as never);
    expect(() => verifier.verify(token)).toThrow('Token invalido ou expirado.');
  });
});

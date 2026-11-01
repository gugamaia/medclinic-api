import { describe, expect, it } from 'vitest';
import { PasswordService } from '../../src/auth/password.service';

describe('PasswordService (RNF01)', () => {
  const service = new PasswordService();

  it('gera um hash diferente do texto original e confere com sucesso', async () => {
    const hashed = await service.hash('minhaSenha123');
    expect(hashed).not.toBe('minhaSenha123');
    expect(await service.compare('minhaSenha123', hashed)).toBe(true);
  });

  it('rejeita a comparacao quando a senha informada esta errada', async () => {
    const hashed = await service.hash('minhaSenha123');
    expect(await service.compare('senhaErrada', hashed)).toBe(false);
  });
});

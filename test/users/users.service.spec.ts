import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UsersService } from '../../src/users/users.service';
import { AppError } from '../../src/common/errors/app-error';

function buildService() {
  const usersRepository = {
    findByEmail: vi.fn(),
    findForAuthentication: vi.fn(),
    create: vi.fn((data: unknown) => data),
    save: vi.fn((data: unknown) => Promise.resolve({ id: 1, ...(data as object) })),
    findOneBy: vi.fn(),
  };
  const passwordService = {
    hash: vi.fn(),
    compare: vi.fn(),
  };
  const jwtService = {
    sign: vi.fn(() => 'signed-token'),
  };

  const service = new UsersService(
    usersRepository as never,
    passwordService as never,
    jwtService as never,
  );

  return { service, usersRepository, passwordService, jwtService };
}

describe('UsersService.login (RF01/RF11)', () => {
  let ctx: ReturnType<typeof buildService>;

  beforeEach(() => {
    ctx = buildService();
  });

  it('rejeita login com e-mail inexistente usando CREDENCIAIS_INVALIDAS', async () => {
    ctx.usersRepository.findForAuthentication.mockResolvedValue(null);

    await expect(
      ctx.service.login({ email: 'ninguem@x.com', password: '123456' }),
    ).rejects.toMatchObject({ code: 'CREDENCIAIS_INVALIDAS' } satisfies Partial<AppError>);
  });

  it('rejeita login com senha incorreta usando a MESMA mensagem de e-mail invalido', async () => {
    ctx.usersRepository.findForAuthentication.mockResolvedValue({
      id: 1,
      email: 'doc@x.com',
      password: 'hash-no-banco',
      roles: ['doctor'],
    });
    ctx.passwordService.compare.mockResolvedValue(false);

    await expect(
      ctx.service.login({ email: 'doc@x.com', password: 'senha-errada' }),
    ).rejects.toMatchObject({ code: 'CREDENCIAIS_INVALIDAS' });
    expect(ctx.passwordService.compare).toHaveBeenCalledWith(
      'senha-errada',
      'hash-no-banco',
    );
  });

  it('autentica com sucesso quando a senha confere e devolve um accessToken assinado', async () => {
    ctx.usersRepository.findForAuthentication.mockResolvedValue({
      id: 42,
      email: 'doc@x.com',
      password: 'hash-no-banco',
      roles: ['doctor'],
    });
    ctx.passwordService.compare.mockResolvedValue(true);

    const result = await ctx.service.login({
      email: 'doc@x.com',
      password: 'senha-certa',
    });

    expect(result).toEqual({ accessToken: 'signed-token' });
    expect(ctx.jwtService.sign).toHaveBeenCalledWith({ sub: 42, roles: ['doctor'] });
  });
});

describe('UsersService.register (RF13)', () => {
  let ctx: ReturnType<typeof buildService>;

  beforeEach(() => {
    ctx = buildService();
  });

  it('rejeita cadastro com e-mail ja existente', async () => {
    ctx.usersRepository.findByEmail.mockResolvedValue({ id: 1 });

    await expect(
      ctx.service.register({
        name: 'Fulano',
        email: 'fulano@x.com',
        password: '123456',
        roles: ['secretary'],
      }),
    ).rejects.toMatchObject({ code: 'EMAIL_JA_CADASTRADO' });
  });

  it('cria o usuario com a senha hasheada (nunca em texto puro)', async () => {
    ctx.usersRepository.findByEmail.mockResolvedValue(null);
    ctx.passwordService.hash.mockResolvedValue('senha-hasheada');

    const result = await ctx.service.register({
      name: 'Fulano',
      email: 'fulano@x.com',
      password: '123456',
      roles: ['secretary'],
    });

    expect(result.email).toBe('fulano@x.com');
    expect((result as unknown as { password?: string }).password).toBeUndefined();
    expect(ctx.usersRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ password: 'senha-hasheada' }),
    );
  });
});

describe('UsersService.me (RF01)', () => {
  let ctx: ReturnType<typeof buildService>;

  beforeEach(() => {
    ctx = buildService();
  });

  it('lanca RECURSO_NAO_ENCONTRADO quando o usuario do token nao existe mais', async () => {
    ctx.usersRepository.findOneBy.mockResolvedValue(null);

    await expect(ctx.service.me(999)).rejects.toMatchObject({
      code: 'RECURSO_NAO_ENCONTRADO',
    });
  });

  it('devolve os dados do usuario autenticado sem o campo password', async () => {
    ctx.usersRepository.findOneBy.mockResolvedValue({
      id: 1,
      name: 'Fulano',
      email: 'fulano@x.com',
      roles: ['admin'],
    });

    const result = await ctx.service.me(1);
    expect(result).toEqual({
      id: 1,
      name: 'Fulano',
      email: 'fulano@x.com',
      roles: ['admin'],
    });
  });
});

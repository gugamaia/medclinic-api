import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DoctorsService } from '../../src/doctors/doctors.service';

function buildService() {
  const userRepo = {
    create: vi.fn((data: unknown) => data),
    save: vi.fn((data: unknown) =>
      Promise.resolve({ id: 10, ...(data as object) }),
    ),
  };
  const doctorRepo = {
    create: vi.fn((data: unknown) => data),
    save: vi.fn((data: unknown) =>
      Promise.resolve({ id: 20, ...(data as object) }),
    ),
  };

  const dataSource = {
    transaction: vi.fn((cb: (manager: unknown) => unknown) => {
      const manager = {
        getRepository: vi.fn((entity: { name: string }) =>
          entity.name === 'User' ? userRepo : doctorRepo,
        ),
      };
      return cb(manager);
    }),
  };

  const doctorsRepository = {
    findByCrm: vi.fn(),
    findByIdWithUser: vi.fn(),
    findByUserId: vi.fn(),
    listPaginated: vi.fn(),
  };
  const usersRepository = {
    findByEmail: vi.fn(),
  };
  const passwordService = {
    hash: vi.fn().mockResolvedValue('hash-fake'),
  };

  const service = new DoctorsService(
    dataSource as never,
    doctorsRepository as never,
    usersRepository as never,
    passwordService as never,
  );

  return {
    service,
    dataSource,
    doctorsRepository,
    usersRepository,
    passwordService,
  };
}

describe('DoctorsService.create (RF03/RN03 - atomicidade)', () => {
  let ctx: ReturnType<typeof buildService>;

  beforeEach(() => {
    ctx = buildService();
  });

  it('rejeita quando o e-mail ja esta cadastrado', async () => {
    ctx.usersRepository.findByEmail.mockResolvedValue({ id: 1 });
    ctx.doctorsRepository.findByCrm.mockResolvedValue(null);

    await expect(
      ctx.service.create({
        name: 'Dra. Ana',
        email: 'ana@x.com',
        password: '123456',
        crm: 'CRM123',
      }),
    ).rejects.toMatchObject({ code: 'EMAIL_JA_CADASTRADO' });
    expect(ctx.dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rejeita quando o CRM ja esta cadastrado', async () => {
    ctx.usersRepository.findByEmail.mockResolvedValue(null);
    ctx.doctorsRepository.findByCrm.mockResolvedValue({ id: 1 });

    await expect(
      ctx.service.create({
        name: 'Dra. Ana',
        email: 'ana@x.com',
        password: '123456',
        crm: 'CRM123',
      }),
    ).rejects.toMatchObject({ code: 'CRM_JA_CADASTRADO' });
  });

  it('cria usuario e medico na mesma transacao quando tudo e valido', async () => {
    ctx.usersRepository.findByEmail.mockResolvedValue(null);
    ctx.doctorsRepository.findByCrm.mockResolvedValue(null);

    const result = await ctx.service.create({
      name: 'Dra. Ana',
      email: 'ana@x.com',
      password: '123456',
      crm: 'CRM123',
    });

    expect(ctx.dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(result.crm).toBe('CRM123');
    expect(result.user.email).toBe('ana@x.com');
  });

  it('traduz violacao de unique do Postgres por e-mail na corrida', async () => {
    ctx.usersRepository.findByEmail.mockResolvedValue(null);
    ctx.doctorsRepository.findByCrm.mockResolvedValue(null);
    ctx.dataSource.transaction.mockRejectedValue(
      Object.assign(new Error('duplicate'), {
        code: '23505',
        detail: 'Key (email)=(ana@x.com) already exists.',
      }),
    );

    await expect(
      ctx.service.create({
        name: 'Dra. Ana',
        email: 'ana@x.com',
        password: '123456',
        crm: 'CRM123',
      }),
    ).rejects.toMatchObject({ code: 'EMAIL_JA_CADASTRADO' });
  });

  it('lanca RECURSO_NAO_ENCONTRADO quando o medico nao existe', async () => {
    ctx.doctorsRepository.findByIdWithUser.mockResolvedValue(null);

    await expect(ctx.service.getOrFail(999)).rejects.toMatchObject({
      code: 'RECURSO_NAO_ENCONTRADO',
    });
  });

  it('traduz violacao de unique do Postgres por CRM na corrida', async () => {
    ctx.usersRepository.findByEmail.mockResolvedValue(null);
    ctx.doctorsRepository.findByCrm.mockResolvedValue(null);
    ctx.dataSource.transaction.mockRejectedValue(
      Object.assign(new Error('duplicate'), {
        code: '23505',
        detail: 'Key (crm)=(CRM123) already exists.',
      }),
    );

    await expect(
      ctx.service.create({
        name: 'Dra. Ana',
        email: 'ana@x.com',
        password: '123456',
        crm: 'CRM123',
      }),
    ).rejects.toMatchObject({ code: 'CRM_JA_CADASTRADO' });
  });

  it('repassa erros que nao sao violacao de unique sem traduzir', async () => {
    ctx.usersRepository.findByEmail.mockResolvedValue(null);
    ctx.doctorsRepository.findByCrm.mockResolvedValue(null);
    const genericError = new Error('falha de conexao com o banco');
    ctx.dataSource.transaction.mockRejectedValue(genericError);

    await expect(
      ctx.service.create({
        name: 'Dra. Ana',
        email: 'ana@x.com',
        password: '123456',
        crm: 'CRM123',
      }),
    ).rejects.toBe(genericError);
  });

  it('lista medicos paginados filtrando por nome', async () => {
    ctx.doctorsRepository.listPaginated.mockResolvedValue([
      [
        {
          id: 1,
          crm: 'CRM1',
          user: { id: 1, name: 'Ana', email: 'a@x.com', roles: ['doctor'] },
        },
      ],
      1,
    ]);

    const result = await ctx.service.list(1, 20, 'Ana');

    expect(result.meta.total).toBe(1);
    expect(ctx.doctorsRepository.listPaginated).toHaveBeenCalledWith(
      1,
      20,
      'Ana',
    );
  });

  it('devolve o medico pelo id (findById)', async () => {
    ctx.doctorsRepository.findByIdWithUser.mockResolvedValue({
      id: 1,
      crm: 'CRM1',
      user: { id: 1, name: 'Ana', email: 'a@x.com', roles: ['doctor'] },
    });

    const result = await ctx.service.findById(1);
    expect(result.crm).toBe('CRM1');
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PatientsService } from '../../src/patients/patients.service';

function buildService() {
  const patientsRepository = {
    findByCpf: vi.fn(),
    create: vi.fn((data: unknown) => data),
    save: vi.fn((data: unknown) =>
      Promise.resolve({ id: 1, createdAt: new Date(), ...(data as object) }),
    ),
    listPaginated: vi.fn(),
    findOneBy: vi.fn(),
    softDelete: vi.fn(),
  };

  const service = new PatientsService(patientsRepository as never);
  return { service, patientsRepository };
}

describe('PatientsService (RF02/RN02)', () => {
  let ctx: ReturnType<typeof buildService>;

  beforeEach(() => {
    ctx = buildService();
  });

  it('traduz a violacao unique do banco em CPF_JA_CADASTRADO (corrida ou paciente removido)', async () => {
    ctx.patientsRepository.findByCpf.mockResolvedValue(null);
    ctx.patientsRepository.save.mockRejectedValue({ code: '23505' });

    await expect(
      ctx.service.create({ name: 'Novo', cpf: '12345678901' }),
    ).rejects.toMatchObject({ code: 'CPF_JA_CADASTRADO' });
  });

  it('propaga erros inesperados do banco sem traduzi-los', async () => {
    ctx.patientsRepository.findByCpf.mockResolvedValue(null);
    ctx.patientsRepository.save.mockRejectedValue(new Error('falha'));

    await expect(
      ctx.service.create({ name: 'Novo', cpf: '12345678901' }),
    ).rejects.toThrow('falha');
  });

  it('rejeita cadastro com CPF ja existente', async () => {
    ctx.patientsRepository.findByCpf.mockResolvedValue({
      id: 5,
      cpf: '12345678901',
    });

    await expect(
      ctx.service.create({ name: 'Joao', cpf: '12345678901' }),
    ).rejects.toMatchObject({ code: 'CPF_JA_CADASTRADO' });
  });

  it('cria o paciente com sucesso quando o CPF e inedito', async () => {
    ctx.patientsRepository.findByCpf.mockResolvedValue(null);

    const result = await ctx.service.create({
      name: 'Joao',
      cpf: '12345678901',
    });
    expect(result.name).toBe('Joao');
    expect(result.cpf).toBe('12345678901');
  });

  it('lanca RECURSO_NAO_ENCONTRADO ao buscar um paciente inexistente', async () => {
    ctx.patientsRepository.findOneBy.mockResolvedValue(null);

    await expect(ctx.service.findById(999)).rejects.toMatchObject({
      code: 'RECURSO_NAO_ENCONTRADO',
    });
  });

  it('atualiza somente o campo informado, preservando os demais', async () => {
    ctx.patientsRepository.findOneBy.mockResolvedValue({
      id: 1,
      name: 'Nome Antigo',
      cpf: '12345678901',
    });

    const result = await ctx.service.update(1, { name: 'Nome Novo' });
    expect(result.name).toBe('Nome Novo');
    expect(result.cpf).toBe('12345678901');
  });

  it('remove logicamente o paciente via softDelete', async () => {
    ctx.patientsRepository.findOneBy.mockResolvedValue({ id: 1 });

    await ctx.service.remove(1);
    expect(ctx.patientsRepository.softDelete).toHaveBeenCalledWith(1);
  });

  it('lista pacientes paginados, com e sem filtro por nome', async () => {
    ctx.patientsRepository.listPaginated.mockResolvedValue([[], 0]);

    await ctx.service.list(1, 20);
    expect(ctx.patientsRepository.listPaginated).toHaveBeenCalledWith(
      1,
      20,
      undefined,
    );

    await ctx.service.list(1, 20, 'Ana');
    expect(ctx.patientsRepository.listPaginated).toHaveBeenCalledWith(
      1,
      20,
      'Ana',
    );
  });

  it('update sem "name" preserva o nome atual sem chamar nada extra', async () => {
    ctx.patientsRepository.findOneBy.mockResolvedValue({
      id: 1,
      name: 'Nome Atual',
      cpf: '12345678901',
    });

    const result = await ctx.service.update(1, {});
    expect(result.name).toBe('Nome Atual');
  });
});

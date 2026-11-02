import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MedicalRecordsService } from '../../src/medical-records/medical-records.service';

function buildService() {
  const medicalRecordsRepository = {
    create: vi.fn((data: unknown) => data),
    save: vi.fn((data: unknown) =>
      Promise.resolve({ id: 1, createdAt: new Date(), ...(data as object) }),
    ),
    listByPatient: vi.fn(),
  };
  const appointmentsRepository = {
    hasLink: vi.fn(),
  };
  const patientsService = {
    getOrFail: vi.fn().mockResolvedValue({ id: 1 }),
  };
  const doctorsService = {
    findByUserId: vi.fn(),
  };

  const service = new MedicalRecordsService(
    medicalRecordsRepository as never,
    appointmentsRepository as never,
    patientsService as never,
    doctorsService as never,
  );

  return {
    service,
    medicalRecordsRepository,
    appointmentsRepository,
    patientsService,
    doctorsService,
  };
}

describe('MedicalRecordsService.create (RF09/RN14)', () => {
  let ctx: ReturnType<typeof buildService>;

  beforeEach(() => {
    ctx = buildService();
  });

  it('rejeita a escrita quando o medico NAO tem vinculo com o paciente', async () => {
    ctx.doctorsService.findByUserId.mockResolvedValue({ id: 5, userId: 10 });
    ctx.appointmentsRepository.hasLink.mockResolvedValue(false);

    await expect(
      ctx.service.create(
        { patientId: 1, text: 'Paciente relata dor de cabeca.' },
        { id: 10, roles: ['doctor'] },
      ),
    ).rejects.toMatchObject({ code: 'ACESSO_NEGADO' });
  });

  it('permite a escrita quando existe vinculo (consulta in_progress/done) entre medico e paciente', async () => {
    ctx.doctorsService.findByUserId.mockResolvedValue({ id: 5, userId: 10 });
    ctx.appointmentsRepository.hasLink.mockResolvedValue(true);

    const result = await ctx.service.create(
      { patientId: 1, text: 'Paciente relata dor de cabeca.' },
      { id: 10, roles: ['doctor'] },
    );

    expect(result.doctorId).toBe(5);
    expect(result.patientId).toBe(1);
    expect(ctx.appointmentsRepository.hasLink).toHaveBeenCalledWith(5, 1);
  });

  it('usa sempre o doctorId resolvido do usuario autenticado, nunca um valor do corpo da requisicao', async () => {
    ctx.doctorsService.findByUserId.mockResolvedValue({ id: 5, userId: 10 });
    ctx.appointmentsRepository.hasLink.mockResolvedValue(true);

    await ctx.service.create(
      { patientId: 1, text: 'texto' },
      { id: 10, roles: ['doctor'] },
    );

    expect(ctx.medicalRecordsRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ doctorId: 5 }),
    );
  });
});

describe('MedicalRecordsService.listByPatient (RF09/RN14)', () => {
  let ctx: ReturnType<typeof buildService>;

  beforeEach(() => {
    ctx = buildService();
  });

  it('admin pode listar o historico de qualquer paciente, sem checar vinculo', async () => {
    ctx.medicalRecordsRepository.listByPatient.mockResolvedValue([[], 0]);

    await ctx.service.listByPatient(1, 1, 20, { id: 1, roles: ['admin'] });

    expect(ctx.doctorsService.findByUserId).not.toHaveBeenCalled();
  });

  it('medico sem vinculo com o paciente e bloqueado na leitura', async () => {
    ctx.doctorsService.findByUserId.mockResolvedValue({ id: 5, userId: 10 });
    ctx.appointmentsRepository.hasLink.mockResolvedValue(false);

    await expect(
      ctx.service.listByPatient(1, 1, 20, { id: 10, roles: ['doctor'] }),
    ).rejects.toMatchObject({ code: 'ACESSO_NEGADO' });
  });

  it('medico com vinculo consegue listar o historico do paciente', async () => {
    ctx.doctorsService.findByUserId.mockResolvedValue({ id: 5, userId: 10 });
    ctx.appointmentsRepository.hasLink.mockResolvedValue(true);
    ctx.medicalRecordsRepository.listByPatient.mockResolvedValue([[], 0]);

    const result = await ctx.service.listByPatient(1, 1, 20, {
      id: 10,
      roles: ['doctor'],
    });

    expect(result.meta.total).toBe(0);
  });
});

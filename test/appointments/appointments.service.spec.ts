import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppointmentsService } from '../../src/appointments/appointments.service';
import { AppError } from '../../src/common/errors/app-error';

/**
 * startsAt usado nos testes: segunda-feira 09:00 no horario local da
 * clinica (RN06, America/Sao_Paulo = -03:00), ou seja 12:00Z.
 */
const MONDAY_09_00 = '2026-03-09T09:00:00-03:00';
const ADMIN = { id: 1, roles: ['admin'] };

const DOCTOR_SHIFT = {
  weekDay: 1,
  startTime: '08:00',
  endTime: '12:00',
  slotDurationMinutes: 30,
};

function buildService() {
  const dataSource = {
    transaction: vi.fn((cb: (manager: unknown) => unknown) => {
      const appointmentRepo = {
        createQueryBuilder: vi.fn(() => queryBuilderStub),
        create: vi.fn((data: unknown) => data),
        save: vi.fn((data: unknown) =>
          Promise.resolve({ id: 1, ...(data as object) }),
        ),
      };
      const manager = {
        createQueryBuilder: vi.fn(() => ({
          setLock: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          getOne: vi.fn().mockResolvedValue({ id: 1 }),
        })),
        getRepository: vi.fn(() => appointmentRepo),
      };
      return cb(manager);
    }),
  };

  const queryBuilderStub = {
    where: vi.fn().mockReturnThis(),
    andWhere: vi.fn().mockReturnThis(),
    getMany: vi.fn().mockResolvedValue([]),
  };

  const appointmentsRepository = {
    listFiltered: vi.fn(),
    findOneBy: vi.fn(),
    save: vi.fn(),
  };
  const workScheduleRepository = {
    findByDoctorId: vi.fn().mockResolvedValue([DOCTOR_SHIFT]),
  };
  const doctorsService = {
    getOrFail: vi.fn().mockResolvedValue({ id: 1, userId: 10 }),
  };
  const patientsService = {
    getOrFail: vi.fn().mockResolvedValue({ id: 1 }),
  };

  const service = new AppointmentsService(
    dataSource as never,
    appointmentsRepository as never,
    workScheduleRepository as never,
    doctorsService as never,
    patientsService as never,
  );

  return {
    service,
    dataSource,
    queryBuilderStub,
    appointmentsRepository,
    workScheduleRepository,
    doctorsService,
    patientsService,
  };
}

describe('AppointmentsService.create (RF06/RF07/RN07-RN10)', () => {
  let ctx: ReturnType<typeof buildService>;

  beforeEach(() => {
    ctx = buildService();
  });

  it('rejeita quando o medico nao existe', async () => {
    ctx.doctorsService.getOrFail.mockRejectedValue(
      new AppError('RECURSO_NAO_ENCONTRADO', 'Medico nao encontrado.'),
    );

    await expect(
      ctx.service.create({
        doctorId: 999,
        patientId: 1,
        startsAt: MONDAY_09_00,
      }),
    ).rejects.toMatchObject({ code: 'RECURSO_NAO_ENCONTRADO' });
  });

  it('rejeita quando o paciente nao existe', async () => {
    ctx.patientsService.getOrFail.mockRejectedValue(
      new AppError('RECURSO_NAO_ENCONTRADO', 'Paciente nao encontrado.'),
    );

    await expect(
      ctx.service.create({
        doctorId: 1,
        patientId: 999,
        startsAt: MONDAY_09_00,
      }),
    ).rejects.toMatchObject({ code: 'RECURSO_NAO_ENCONTRADO' });
  });

  it('rejeita horario fora de qualquer turno da escala (RN07)', async () => {
    await expect(
      ctx.service.create({
        doctorId: 1,
        patientId: 1,
        startsAt: '2026-03-09T20:00:00-03:00', // 20h, fora do turno 08h-12h
      }),
    ).rejects.toMatchObject({ code: 'HORARIO_FORA_DA_ESCALA' });
  });

  it('rejeita horario nao alinhado ao grid de slots do turno', async () => {
    await expect(
      ctx.service.create({
        doctorId: 1,
        patientId: 1,
        startsAt: '2026-03-09T09:15:00-03:00', // slot de 30min, offset de 15min nao alinha
      }),
    ).rejects.toMatchObject({ code: 'HORARIO_FORA_DA_ESCALA' });
  });

  it('rejeita quando o slot ultrapassa o fim do turno', async () => {
    ctx.workScheduleRepository.findByDoctorId.mockResolvedValue([
      {
        weekDay: 1,
        startTime: '08:00',
        endTime: '09:15',
        slotDurationMinutes: 30,
      },
    ]);

    await expect(
      ctx.service.create({
        doctorId: 1,
        patientId: 1,
        startsAt: '2026-03-09T09:00:00-03:00', // 09:00 + 30min = 09:30 > fim do turno (09:15)
      }),
    ).rejects.toMatchObject({ code: 'HORARIO_FORA_DA_ESCALA' });
  });

  it('rejeita quando o medico ja tem um agendamento conflitante (RN10)', async () => {
    ctx.queryBuilderStub.getMany.mockResolvedValueOnce([{ id: 5 }]);

    await expect(
      ctx.service.create({ doctorId: 1, patientId: 1, startsAt: MONDAY_09_00 }),
    ).rejects.toMatchObject({ code: 'HORARIO_INDISPONIVEL' });
  });

  it('rejeita quando o paciente ja tem um agendamento conflitante', async () => {
    ctx.queryBuilderStub.getMany
      .mockResolvedValueOnce([]) // sem conflito para o medico
      .mockResolvedValueOnce([{ id: 7 }]); // conflito para o paciente

    await expect(
      ctx.service.create({ doctorId: 1, patientId: 1, startsAt: MONDAY_09_00 }),
    ).rejects.toMatchObject({ code: 'PACIENTE_INDISPONIVEL' });
  });

  it('interpreta a escala no relogio local: 08:00 local (11:00Z) existe, 05:00 local (08:00Z) nao (RN06)', async () => {
    const ok = await ctx.service.create({
      doctorId: 1,
      patientId: 1,
      startsAt: '2026-03-09T11:00:00.000Z',
    });
    expect(ok.status).toBe('scheduled');

    await expect(
      ctx.service.create({
        doctorId: 1,
        patientId: 1,
        startsAt: '2026-03-09T08:00:00.000Z',
      }),
    ).rejects.toMatchObject({ code: 'HORARIO_FORA_DA_ESCALA' });
  });

  it('calcula endsAt somando a duracao do turno ao inicio (RF06)', async () => {
    const result = await ctx.service.create({
      doctorId: 1,
      patientId: 1,
      startsAt: MONDAY_09_00,
    });
    expect(result.endsAt.getTime() - result.startsAt.getTime()).toBe(
      30 * 60_000,
    );
  });

  it('cria o agendamento com sucesso quando todas as validacoes passam', async () => {
    const result = await ctx.service.create({
      doctorId: 1,
      patientId: 1,
      startsAt: MONDAY_09_00,
    });

    expect(result.status).toBe('scheduled');
    expect(result.doctorId).toBe(1);
    expect(result.patientId).toBe(1);
  });
});

describe('AppointmentsService.updateStatus (RN11/RN12)', () => {
  let ctx: ReturnType<typeof buildService>;

  beforeEach(() => {
    ctx = buildService();
  });

  it('permite a transicao scheduled -> in_progress pelo proprio medico', async () => {
    ctx.appointmentsRepository.findOneBy.mockResolvedValue({
      id: 1,
      doctorId: 1,
      status: 'scheduled',
    });
    ctx.appointmentsRepository.save.mockImplementation((a: unknown) =>
      Promise.resolve(a),
    );

    const result = await ctx.service.updateStatus(1, 'in_progress', {
      id: 10,
      roles: ['doctor'],
    });

    expect(result.status).toBe('in_progress');
  });

  it('rejeita transicao invalida (done -> scheduled) com TRANSICAO_INVALIDA', async () => {
    ctx.appointmentsRepository.findOneBy.mockResolvedValue({
      id: 1,
      doctorId: 1,
      status: 'done',
    });

    await expect(
      ctx.service.updateStatus(1, 'scheduled', { id: 10, roles: ['doctor'] }),
    ).rejects.toMatchObject({ code: 'TRANSICAO_INVALIDA' });
  });

  it('rejeita quando um medico tenta mudar o status de um agendamento de outro medico', async () => {
    ctx.appointmentsRepository.findOneBy.mockResolvedValue({
      id: 1,
      doctorId: 1,
      status: 'scheduled',
    });

    await expect(
      ctx.service.updateStatus(1, 'in_progress', { id: 99, roles: ['doctor'] }),
    ).rejects.toMatchObject({ code: 'ACESSO_NEGADO' });
  });

  function withStatus(status: string) {
    ctx.appointmentsRepository.findOneBy.mockResolvedValue({
      id: 1,
      doctorId: 1,
      status,
    });
    ctx.appointmentsRepository.save.mockImplementation((a: unknown) =>
      Promise.resolve(a),
    );
  }

  it('secretary cancela consulta agendada', async () => {
    withStatus('scheduled');
    const result = await ctx.service.updateStatus(1, 'cancelled', {
      id: 555,
      roles: ['secretary'],
    });
    expect(result.status).toBe('cancelled');
  });

  it('secretary NAO cancela consulta em andamento (RN12)', async () => {
    withStatus('in_progress');
    await expect(
      ctx.service.updateStatus(1, 'cancelled', {
        id: 555,
        roles: ['secretary'],
      }),
    ).rejects.toMatchObject({ code: 'ACESSO_NEGADO' });
  });

  it('admin coloca em andamento e conclui', async () => {
    withStatus('scheduled');
    const started = await ctx.service.updateStatus(1, 'in_progress', ADMIN);
    expect(started.status).toBe('in_progress');

    withStatus('in_progress');
    const done = await ctx.service.updateStatus(1, 'done', ADMIN);
    expect(done.status).toBe('done');
  });

  it('secretary nao inicia nem conclui atendimento', async () => {
    withStatus('scheduled');
    await expect(
      ctx.service.updateStatus(1, 'in_progress', {
        id: 5,
        roles: ['secretary'],
      }),
    ).rejects.toMatchObject({ code: 'ACESSO_NEGADO' });
  });

  it('medico da consulta cancela consulta em andamento', async () => {
    withStatus('in_progress');
    const result = await ctx.service.updateStatus(1, 'cancelled', {
      id: 10,
      roles: ['doctor'],
    });
    expect(result.status).toBe('cancelled');
  });

  it('consulta cancelada nao muda mais de estado', async () => {
    withStatus('cancelled');
    await expect(
      ctx.service.updateStatus(1, 'scheduled', ADMIN),
    ).rejects.toMatchObject({ code: 'TRANSICAO_INVALIDA' });
  });
});

describe('AppointmentsService.findById / list', () => {
  let ctx: ReturnType<typeof buildService>;

  beforeEach(() => {
    ctx = buildService();
  });

  it('lanca RECURSO_NAO_ENCONTRADO quando o agendamento nao existe', async () => {
    ctx.appointmentsRepository.findOneBy.mockResolvedValue(null);

    await expect(ctx.service.findById(999)).rejects.toMatchObject({
      code: 'RECURSO_NAO_ENCONTRADO',
    });
  });

  it('lista agendamentos paginados aplicando o filtro recebido', async () => {
    ctx.appointmentsRepository.listFiltered.mockResolvedValue([[], 0]);

    const result = await ctx.service.list(
      { doctorId: 1, page: 1, pageSize: 20 },
      ADMIN,
    );

    expect(result.meta.total).toBe(0);
    expect(ctx.appointmentsRepository.listFiltered).toHaveBeenCalledWith(
      expect.objectContaining({ doctorId: 1 }),
      1,
      20,
    );
  });

  it('converte from/to (YYYY-MM-DD) para o dia inteiro local, com "to" exclusivo no dia seguinte', async () => {
    ctx.appointmentsRepository.listFiltered.mockResolvedValue([[], 0]);

    await ctx.service.list(
      { from: '2026-03-09', to: '2026-03-10', page: 1, pageSize: 20 },
      ADMIN,
    );

    const [filter] = ctx.appointmentsRepository.listFiltered.mock.calls[0] as [
      { from: Date; to: Date },
    ];
    expect(filter.from.toISOString()).toBe('2026-03-09T03:00:00.000Z');
    expect(filter.to.toISOString()).toBe('2026-03-11T03:00:00.000Z');
  });

  it('rejeita data fora do formato YYYY-MM-DD', async () => {
    await expect(
      ctx.service.list({ from: '09/03/2026', page: 1, pageSize: 20 }, ADMIN),
    ).rejects.toMatchObject({ code: 'DADOS_INVALIDOS' });
  });

  it('medico so enxerga os proprios agendamentos, ignorando o doctorId da query', async () => {
    ctx.appointmentsRepository.listFiltered.mockResolvedValue([[], 0]);
    ctx.doctorsService.findByUserId = vi.fn().mockResolvedValue({ id: 7 });

    await ctx.service.list(
      { doctorId: 99, page: 1, pageSize: 20 },
      { id: 10, roles: ['doctor'] },
    );

    expect(ctx.appointmentsRepository.listFiltered).toHaveBeenCalledWith(
      expect.objectContaining({ doctorId: 7 }),
      1,
      20,
    );
  });

  it('medico recebe ACESSO_NEGADO ao abrir agendamento de outro medico', async () => {
    ctx.appointmentsRepository.findOneBy.mockResolvedValue({
      id: 1,
      doctorId: 1,
    });
    ctx.doctorsService.findByUserId = vi.fn().mockResolvedValue({ id: 7 });

    await expect(
      ctx.service.findForUser(1, { id: 10, roles: ['doctor'] }),
    ).rejects.toMatchObject({ code: 'ACESSO_NEGADO' });
  });
});

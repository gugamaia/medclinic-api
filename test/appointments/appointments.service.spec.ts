import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AppointmentsService } from '../../src/appointments/appointments.service';
import { AppError } from '../../src/common/errors/app-error';

/**
 * startsAt usado nos testes: segunda-feira (weekDay=1 em UTC),
 * 2026-03-09T09:00:00.000Z.
 */
const MONDAY_09_00 = '2026-03-09T09:00:00.000Z';

const DOCTOR_SHIFT = {
  weekDay: 1,
  startTime: '08:00',
  endTime: '12:00',
  slotDurationMinutes: 30,
};

function buildService() {
  const dataSource = {
    transaction: vi.fn(async (cb: (manager: unknown) => unknown) => {
      const appointmentRepo = {
        createQueryBuilder: vi.fn(() => queryBuilderStub),
        create: vi.fn((data: unknown) => data),
        save: vi.fn((data: unknown) => Promise.resolve({ id: 1, ...(data as object) })),
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
      ctx.service.create({ doctorId: 999, patientId: 1, startsAt: MONDAY_09_00 }),
    ).rejects.toMatchObject({ code: 'RECURSO_NAO_ENCONTRADO' });
  });

  it('rejeita quando o paciente nao existe', async () => {
    ctx.patientsService.getOrFail.mockRejectedValue(
      new AppError('RECURSO_NAO_ENCONTRADO', 'Paciente nao encontrado.'),
    );

    await expect(
      ctx.service.create({ doctorId: 1, patientId: 999, startsAt: MONDAY_09_00 }),
    ).rejects.toMatchObject({ code: 'RECURSO_NAO_ENCONTRADO' });
  });

  it('rejeita horario fora de qualquer turno da escala (RN07)', async () => {
    await expect(
      ctx.service.create({
        doctorId: 1,
        patientId: 1,
        startsAt: '2026-03-09T20:00:00.000Z', // 20h, fora do turno 08h-12h
      }),
    ).rejects.toMatchObject({ code: 'HORARIO_FORA_DA_ESCALA' });
  });

  it('rejeita horario nao alinhado ao grid de slots do turno', async () => {
    await expect(
      ctx.service.create({
        doctorId: 1,
        patientId: 1,
        startsAt: '2026-03-09T09:15:00.000Z', // slot de 30min, offset de 15min nao alinha
      }),
    ).rejects.toMatchObject({ code: 'HORARIO_FORA_DA_ESCALA' });
  });

  it('rejeita quando o slot ultrapassa o fim do turno', async () => {
    ctx.workScheduleRepository.findByDoctorId.mockResolvedValue([
      { weekDay: 1, startTime: '08:00', endTime: '09:15', slotDurationMinutes: 30 },
    ]);

    await expect(
      ctx.service.create({
        doctorId: 1,
        patientId: 1,
        startsAt: '2026-03-09T09:00:00.000Z', // 09:00 + 30min = 09:30 > fim do turno (09:15)
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

  it('permite que admin/secretary cancelem um agendamento de qualquer medico', async () => {
    ctx.appointmentsRepository.findOneBy.mockResolvedValue({
      id: 1,
      doctorId: 1,
      status: 'scheduled',
    });
    ctx.appointmentsRepository.save.mockImplementation((a: unknown) =>
      Promise.resolve(a),
    );

    const result = await ctx.service.updateStatus(1, 'cancelled', {
      id: 555,
      roles: ['secretary'],
    });

    expect(result.status).toBe('cancelled');
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

    const result = await ctx.service.list({ doctorId: 1 }, 1, 20);

    expect(result.meta.total).toBe(0);
    expect(ctx.appointmentsRepository.listFiltered).toHaveBeenCalledWith(
      { doctorId: 1 },
      1,
      20,
    );
  });
});

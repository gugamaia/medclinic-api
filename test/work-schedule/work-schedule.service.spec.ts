import { beforeEach, describe, expect, it, vi } from 'vitest';
import { findShiftConflict, WorkScheduleService } from '../../src/work-schedule/work-schedule.service';
import { ShiftDto } from '../../src/work-schedule/dto/shift.dto';

function shift(weekDay: number, startTime: string, endTime: string): ShiftDto {
  const dto = new ShiftDto();
  dto.weekDay = weekDay;
  dto.startTime = startTime;
  dto.endTime = endTime;
  dto.slotDurationMinutes = 30;
  return dto;
}

describe('findShiftConflict (RN05)', () => {
  it('aceita uma lista de turnos sem sobreposicao', () => {
    const conflict = findShiftConflict([
      shift(1, '08:00', '12:00'),
      shift(1, '13:00', '18:00'),
      shift(2, '08:00', '12:00'),
    ]);
    expect(conflict).toBeNull();
  });

  it('aceita turnos que apenas se tocam no mesmo dia', () => {
    const conflict = findShiftConflict([
      shift(3, '08:00', '12:00'),
      shift(3, '12:00', '16:00'),
    ]);
    expect(conflict).toBeNull();
  });

  it('rejeita dois turnos sobrepostos no mesmo dia da semana', () => {
    const conflict = findShiftConflict([
      shift(1, '08:00', '12:00'),
      shift(1, '11:00', '14:00'),
    ]);
    expect(conflict).not.toBeNull();
  });

  it('nao rejeita turnos no mesmo horario em dias diferentes', () => {
    const conflict = findShiftConflict([
      shift(1, '08:00', '12:00'),
      shift(2, '08:00', '12:00'),
    ]);
    expect(conflict).toBeNull();
  });

  it('rejeita um turno cujo horario de inicio nao e antes do fim', () => {
    const conflict = findShiftConflict([shift(1, '12:00', '12:00')]);
    expect(conflict).not.toBeNull();
  });
});

describe('WorkScheduleService.replace (RF04/RN15)', () => {
  function buildService() {
    const repo = {
      create: vi.fn((data: unknown) => data),
      save: vi.fn((data: unknown) => Promise.resolve(data)),
      delete: vi.fn(),
    };
    const dataSource = {
      transaction: vi.fn(async (cb: (manager: unknown) => unknown) => {
        const manager = { getRepository: vi.fn(() => repo) };
        return cb(manager);
      }),
    };
    const workScheduleRepository = {
      findByDoctorId: vi.fn().mockResolvedValue([]),
    };
    const doctorsService = {
      getOrFail: vi.fn().mockResolvedValue({ id: 1 }),
    };

    const service = new WorkScheduleService(
      dataSource as never,
      workScheduleRepository as never,
      doctorsService as never,
    );

    return { service, dataSource, repo, workScheduleRepository, doctorsService };
  }

  let ctx: ReturnType<typeof buildService>;

  beforeEach(() => {
    ctx = buildService();
  });

  it('rejeita a troca quando o medico nao existe', async () => {
    ctx.doctorsService.getOrFail.mockRejectedValue(
      new Error('medico nao encontrado'),
    );

    await expect(
      ctx.service.replace(999, [shift(1, '08:00', '12:00')]),
    ).rejects.toThrow();
    expect(ctx.dataSource.transaction).not.toHaveBeenCalled();
  });

  it('rejeita a troca quando os turnos enviados se sobrepoem', async () => {
    await expect(
      ctx.service.replace(1, [
        shift(1, '08:00', '12:00'),
        shift(1, '10:00', '14:00'),
      ]),
    ).rejects.toMatchObject({ code: 'DADOS_INVALIDOS' });
    expect(ctx.dataSource.transaction).not.toHaveBeenCalled();
  });

  it('substitui a escala inteira em uma unica transacao (apaga tudo, insere o novo)', async () => {
    const result = await ctx.service.replace(1, [shift(1, '08:00', '12:00')]);

    expect(ctx.dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(ctx.repo.delete).toHaveBeenCalledWith({ doctorId: 1 });
    expect(result.doctorId).toBe(1);
    expect(result.shifts).toHaveLength(1);
  });
});

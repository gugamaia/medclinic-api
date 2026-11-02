import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CalendarService } from '../../src/calendar/calendar.service';

function buildService() {
  const doctorsService = {
    getOrFail: vi.fn().mockResolvedValue({ id: 1 }),
  };
  const workScheduleRepository = {
    findByDoctorId: vi.fn().mockResolvedValue([
      {
        weekDay: 1,
        startTime: '08:00',
        endTime: '12:00',
        slotDurationMinutes: 30,
      },
    ]),
  };
  const appointmentsRepository = {
    findInRange: vi.fn().mockResolvedValue([]),
  };

  const service = new CalendarService(
    doctorsService as never,
    workScheduleRepository as never,
    appointmentsRepository as never,
  );

  return {
    service,
    doctorsService,
    workScheduleRepository,
    appointmentsRepository,
  };
}

describe('CalendarService.getCalendar (RF05/4.9.6)', () => {
  let ctx: ReturnType<typeof buildService>;

  beforeEach(() => {
    ctx = buildService();
  });

  it('rejeita quando "from" e posterior a "to"', async () => {
    await expect(
      ctx.service.getCalendar(1, '2026-03-10', '2026-03-05'),
    ).rejects.toMatchObject({ code: 'DADOS_INVALIDOS' });
  });

  it('rejeita quando o intervalo ultrapassa 31 dias', async () => {
    await expect(
      ctx.service.getCalendar(1, '2026-01-01', '2026-03-01'),
    ).rejects.toMatchObject({ code: 'DADOS_INVALIDOS' });
  });

  it('devolve escala e agendamentos quando o intervalo e valido', async () => {
    const result = await ctx.service.getCalendar(1, '2026-03-09', '2026-03-15');

    expect(result.workSchedule.shifts).toHaveLength(1);
    expect(result.appointments).toEqual([]);
    // periodo inclusivo, dia inteiro no relogio local (-03:00)
    expect(ctx.appointmentsRepository.findInRange).toHaveBeenCalledWith(
      1,
      new Date('2026-03-09T03:00:00.000Z'),
      new Date('2026-03-16T03:00:00.000Z'),
    );
  });

  it('rejeita data fora do formato YYYY-MM-DD ou inexistente', async () => {
    await expect(
      ctx.service.getCalendar(1, '2026-03-09T00:00:00Z', '2026-03-10'),
    ).rejects.toMatchObject({ code: 'DADOS_INVALIDOS' });
    await expect(
      ctx.service.getCalendar(1, '2026-02-30', '2026-03-10'),
    ).rejects.toMatchObject({ code: 'DADOS_INVALIDOS' });
  });

  it('aceita from igual a to (um unico dia)', async () => {
    await expect(
      ctx.service.getCalendar(1, '2026-03-09', '2026-03-09'),
    ).resolves.toBeDefined();
  });
});

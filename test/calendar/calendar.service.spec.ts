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
      ctx.service.getCalendar(
        1,
        '2026-03-10T00:00:00.000Z',
        '2026-03-05T00:00:00.000Z',
      ),
    ).rejects.toMatchObject({ code: 'DADOS_INVALIDOS' });
  });

  it('rejeita quando o intervalo ultrapassa 31 dias', async () => {
    await expect(
      ctx.service.getCalendar(
        1,
        '2026-01-01T00:00:00.000Z',
        '2026-03-01T00:00:00.000Z',
      ),
    ).rejects.toMatchObject({ code: 'DADOS_INVALIDOS' });
  });

  it('devolve escala e agendamentos quando o intervalo e valido', async () => {
    const result = await ctx.service.getCalendar(
      1,
      '2026-03-09T00:00:00.000Z',
      '2026-03-15T00:00:00.000Z',
    );

    expect(result.doctorId).toBe(1);
    expect(result.workSchedule).toHaveLength(1);
    expect(result.appointments).toEqual([]);
    expect(ctx.appointmentsRepository.findInRange).toHaveBeenCalled();
  });
});

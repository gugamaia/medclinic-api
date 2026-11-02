/**
 * RN06 - os horarios de turno sao hora de relogio local da clinica
 * (America/Sao_Paulo). Este modulo converte instantes (UTC) para o
 * relogio local e datas puras (YYYY-MM-DD) para limites em UTC.
 */
export const CLINIC_TIME_ZONE = 'America/Sao_Paulo';

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

const formatter = new Intl.DateTimeFormat('en-US', {
  timeZone: CLINIC_TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric',
});

export interface ClinicParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  /** 0 (domingo) a 6 (sabado), igual a Date.getDay(). */
  weekDay: number;
  /** Minutos desde a meia-noite local. */
  minutesOfDay: number;
}

/** Instante UTC -> componentes do relogio local da clinica. */
export function toClinicParts(date: Date): ClinicParts {
  const map: Record<string, number> = {};
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') map[part.type] = Number(part.value);
  }
  const weekDay = new Date(
    Date.UTC(map.year, map.month - 1, map.day),
  ).getUTCDay();
  return {
    year: map.year,
    month: map.month,
    day: map.day,
    hour: map.hour,
    minute: map.minute,
    weekDay,
    minutesOfDay: map.hour * 60 + map.minute,
  };
}

/** Valida o formato YYYY-MM-DD e que a data existe no calendario. */
export function isValidDateOnly(value: string): boolean {
  const match = DATE_ONLY.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

/**
 * Inicio (00:00 local) do dia YYYY-MM-DD, como instante UTC. Resolve o
 * deslocamento pelo proprio fuso, sem fixar -03:00.
 */
export function startOfClinicDay(dateOnly: string): Date {
  const [y, m, d] = dateOnly.split('-').map(Number);
  const asUtc = Date.UTC(y, m - 1, d);
  let guess = asUtc;
  for (let i = 0; i < 2; i += 1) {
    const p = toClinicParts(new Date(guess));
    const shown = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
    guess += asUtc - shown;
  }
  return new Date(guess);
}

/** Inicio do dia seguinte (limite exclusivo do periodo inclusivo). */
export function startOfNextClinicDay(dateOnly: string): Date {
  const [y, m, d] = dateOnly.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  return startOfClinicDay(next);
}

/** Quantidade de dias entre duas datas puras (to - from). */
export function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  return (Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000;
}

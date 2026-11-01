/**
 * Converte uma string "HH:MM" para minutos desde a meia-noite.
 * Usado para comparar turnos (RN05) e horarios de agendamento (RN08/RN09)
 * sem precisar de um objeto Date nem tocar fuso horario.
 */
export function timeToMinutes(hhmm: string): number {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * RN05/RN08/RN09 - dois intervalos [aStart, aEnd) e [bStart, bEnd) se
 * sobrepoem quando aStart < bEnd E bStart < aEnd. Intervalos que apenas se
 * tocam (ex.: um termina as 12:00 e outro comeca as 12:00) NAO conflitam.
 */
export function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}

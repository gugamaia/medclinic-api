/**
 * RN08/RN09 - Duas consultas se sobrepoem quando uma comeca antes da
 * outra terminar, dos dois lados. A comparacao e ESTRITA: periodos
 * encostados (um termina exatamente quando o outro comeca) NAO
 * conflitam.
 *
 *   sobrepoe(a, b)  <=>  a.inicio < b.fim  e  b.inicio < a.fim
 */
export function periodsOverlap(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

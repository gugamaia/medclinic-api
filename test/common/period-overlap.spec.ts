import { describe, expect, it } from 'vitest';
import { periodsOverlap } from '../../src/common/period-overlap';

function at(hour: number, minute = 0): Date {
  return new Date(2026, 2, 10, hour, minute, 0, 0);
}

describe('periodsOverlap (RN08/RN09)', () => {
  it('detecta sobreposicao quando um periodo comeca no meio do outro', () => {
    expect(periodsOverlap(at(9), at(10), at(9, 30), at(10, 30))).toBe(true);
  });

  it('detecta sobreposicao quando um periodo contem o outro inteiramente', () => {
    expect(periodsOverlap(at(9), at(12), at(10), at(11))).toBe(true);
  });

  it('NAO detecta conflito quando os periodos apenas se tocam (fim = inicio)', () => {
    expect(periodsOverlap(at(9), at(10), at(10), at(11))).toBe(false);
  });

  it('NAO detecta conflito quando os periodos sao totalmente disjuntos', () => {
    expect(periodsOverlap(at(9), at(10), at(14), at(15))).toBe(false);
  });

  it('detecta sobreposicao quando os periodos sao identicos', () => {
    expect(periodsOverlap(at(9), at(10), at(9), at(10))).toBe(true);
  });
});

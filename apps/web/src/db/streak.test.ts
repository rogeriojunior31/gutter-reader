import { describe, expect, it } from 'vitest';
import { addDays, computeStreak } from './streak.ts';

const TODAY = '2026-11-17';
const days = (...offsets: number[]) => new Set(offsets.map((o) => addDays(TODAY, o)));

describe('addDays', () => {
  it('atravessa mês e ano', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
  });
});

describe('computeStreak', () => {
  it('conta dias seguidos terminando hoje', () => {
    expect(computeStreak(days(0, -1, -2), TODAY)).toEqual({ current: 3, best: 3, atRisk: false });
  });

  it('hoje vazio: a sequência de ontem segue viva, mas em risco', () => {
    expect(computeStreak(days(-1, -2), TODAY)).toEqual({ current: 2, best: 2, atRisk: true });
  });

  it('um dia sem leitura zera', () => {
    expect(computeStreak(days(-2, -3), TODAY)).toEqual({ current: 0, best: 2, atRisk: false });
  });

  it('melhor sequência olha o histórico todo', () => {
    expect(computeStreak(days(0, -10, -11, -12, -13), TODAY)).toMatchObject({
      current: 1,
      best: 4,
    });
  });

  it('sem leitura nenhuma', () => {
    expect(computeStreak(new Set(), TODAY)).toEqual({ current: 0, best: 0, atRisk: false });
  });
});

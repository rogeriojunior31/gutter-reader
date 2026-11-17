/** Datas no fuso local, "AAAA-MM-DD" (en-CA formata assim). */
export function dayKey(d: Date = new Date()): string {
  return d.toLocaleDateString('en-CA');
}

export function addDays(key: string, delta: number): string {
  const [y, m, d] = key.split('-').map(Number) as [number, number, number];
  return dayKey(new Date(y, m - 1, d + delta));
}

export interface StreakInfo {
  /** Dias seguidos com leitura até hoje (ou até ontem, se hoje ainda não leu). */
  current: number;
  best: number;
  /** Hoje ainda não conta: a sequência está viva mas pede leitura hoje. */
  atRisk: boolean;
}

/**
 * Sequência de dias com pelo menos uma página lida. Ler hoje mantém; se hoje ainda
 * está zerado, a sequência de ontem continua valendo até a meia-noite ("em risco").
 */
export function computeStreak(daysWithReading: ReadonlySet<string>, today = dayKey()): StreakInfo {
  const readToday = daysWithReading.has(today);
  let cursor = readToday ? today : addDays(today, -1);
  let current = 0;
  while (daysWithReading.has(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }

  let best = 0;
  let run = 0;
  let prev: string | undefined;
  for (const day of [...daysWithReading].sort()) {
    run = prev && addDays(prev, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }

  return { current, best: Math.max(best, current), atRisk: !readToday && current > 0 };
}

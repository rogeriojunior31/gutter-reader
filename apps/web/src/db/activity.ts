import { useLiveQuery } from 'dexie-react-hooks';
import { db, type ReadingLogEntry } from './db.ts';
import { addDays, computeStreak, dayKey, type StreakInfo } from './streak.ts';

const GOAL_KEY = 'reading.goal';
export const DEFAULT_GOAL = 20;

/** Soma páginas lidas hoje para um livro. */
export async function logPages(
  book: { id: string; seriesId: string; title: string },
  seriesName: string,
  pages: number,
) {
  if (pages <= 0) return;
  const date = dayKey();
  const key = `${date}|${book.id}`;
  await db.transaction('rw', db.readingLog, async () => {
    const prev = await db.readingLog.get(key);
    await db.readingLog.put({
      key,
      date,
      bookId: book.id,
      seriesId: book.seriesId,
      bookTitle: book.title,
      seriesName,
      pages: (prev?.pages ?? 0) + pages,
      updatedAt: Date.now(),
    });
  });
}

export function useDailyGoal(): number {
  return useLiveQuery(
    async () => Number((await db.kv.get(GOAL_KEY))?.value ?? DEFAULT_GOAL),
    [],
    DEFAULT_GOAL,
  );
}

export async function setDailyGoal(pages: number) {
  await db.kv.put({ key: GOAL_KEY, value: Math.max(1, Math.round(pages)) });
}

export interface DayTotal {
  date: string;
  pages: number;
}

export interface Activity {
  today: number;
  streak: StreakInfo;
  /** Últimos `days` dias, do mais antigo ao de hoje, com zeros preenchidos. */
  days: DayTotal[];
  weekPages: number;
  /** Livros concluídos nos últimos 30 dias. */
  finishedThisMonth: number;
  /** Entradas recentes (por dia e livro), mais novas primeiro. */
  recent: ReadingLogEntry[];
  /** Tudo o que foi lido em cada dia (para tocar num dia e ver as edições). */
  byDate: Map<string, ReadingLogEntry[]>;
  /** Já houve alguma leitura registrada? */
  hasAny: boolean;
}

export function useActivity(days = 84): Activity | undefined {
  return useLiveQuery(async () => {
    const today = dayKey();
    const entries = await db.readingLog.toArray();
    const byDay = new Map<string, number>();
    const byDate = new Map<string, ReadingLogEntry[]>();
    for (const e of entries) {
      byDay.set(e.date, (byDay.get(e.date) ?? 0) + e.pages);
      byDate.set(e.date, [...(byDate.get(e.date) ?? []), e]);
    }
    for (const list of byDate.values()) list.sort((a, b) => b.pages - a.pages);

    const series: DayTotal[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = addDays(today, -i);
      series.push({ date, pages: byDay.get(date) ?? 0 });
    }
    const weekPages = series.slice(-7).reduce((n, d) => n + d.pages, 0);
    const monthAgo = Date.now() - 30 * 86_400_000;
    const finishedThisMonth = await db.progress
      .filter((p) => p.completed && p.updatedAt >= monthAgo)
      .count();

    return {
      today: byDay.get(today) ?? 0,
      streak: computeStreak(new Set([...byDay].filter(([, n]) => n > 0).map(([d]) => d)), today),
      days: series,
      weekPages,
      finishedThisMonth,
      recent: [...entries].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 12),
      byDate,
      hasAny: entries.length > 0,
    };
  }, [days]);
}

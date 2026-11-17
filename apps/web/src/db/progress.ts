import { useLiveQuery } from 'dexie-react-hooks';
import { db, type StoredProgress } from './db.ts';

/** `undefined` = carregando; `null` = livro nunca aberto. */
export function useProgress(bookId: string | undefined) {
  return useLiveQuery(
    async () => (bookId ? ((await db.progress.get(bookId)) ?? null) : null),
    [bookId],
  );
}

export function useSeriesProgress(seriesId: string | undefined) {
  return useLiveQuery(
    async () => {
      if (!seriesId) return new Map<string, StoredProgress>();
      const rows = await db.progress.where('seriesId').equals(seriesId).toArray();
      return new Map(rows.map((r) => [r.bookId, r]));
    },
    [seriesId],
    new Map<string, StoredProgress>(),
  );
}

/** Livros começados e não terminados, mais recentes primeiro. */
export function useContinueReading(limit = 12) {
  return useLiveQuery(
    () =>
      db.progress
        .orderBy('updatedAt')
        .reverse()
        .filter((p) => !p.completed && p.page > 0)
        .limit(limit)
        .toArray(),
    [limit],
    [],
  );
}

export interface SeriesStats {
  /** Livros com algum progresso (inclui concluídos). */
  touched: number;
  completed: number;
  /** Soma das frações lidas dos volumes em andamento (0..1 cada). */
  partial: number;
  lastReadAt: number;
}

/** Progresso da série em volumes: concluídos + o quanto dos em andamento já foi lido. */
export function seriesProgress(
  stats: SeriesStats | undefined,
  bookCount: number,
): number | undefined {
  if (!stats || bookCount === 0) return undefined;
  return Math.min(1, (stats.completed + stats.partial) / bookCount);
}

/** Agregado de leitura por série: filtros de status, ordenação por recente, badges. */
export function useSeriesStats() {
  return useLiveQuery(
    async () => {
      const map = new Map<string, SeriesStats>();
      await db.progress.each((p) => {
        const s = map.get(p.seriesId) ?? { touched: 0, completed: 0, partial: 0, lastReadAt: 0 };
        s.touched++;
        if (p.completed) s.completed++;
        else if (p.pageCount > 0 && p.page > 0) s.partial += (p.page + 1) / p.pageCount;
        s.lastReadAt = Math.max(s.lastReadAt, p.updatedAt);
        map.set(p.seriesId, s);
      });
      return map;
    },
    [],
    new Map<string, SeriesStats>(),
  );
}

export type ReadStatus = 'unread' | 'reading' | 'read';

export function readStatus(stats: SeriesStats | undefined, bookCount: number): ReadStatus {
  if (!stats || stats.touched === 0) return 'unread';
  return stats.completed >= bookCount ? 'read' : 'reading';
}

/**
 * Marca (ou desmarca) todos os livros como lidos e devolve uma função que
 * restaura exatamente o progresso anterior (para o "Desfazer").
 */
export async function setSeriesCompleted(
  seriesId: string,
  books: { id: string; seriesId: string; pageCount: number }[],
  completed: boolean,
): Promise<() => Promise<void>> {
  const before = await db.progress.where('seriesId').equals(seriesId).toArray();
  await db.transaction('rw', db.progress, async () => {
    for (const b of books) await setCompleted(b, completed);
  });
  return async () => {
    await db.transaction('rw', db.progress, async () => {
      await db.progress.where('seriesId').equals(seriesId).delete();
      await db.progress.bulkPut(before);
    });
  };
}

export async function clearAllProgress() {
  await db.progress.clear();
}

export async function saveProgress(p: Omit<StoredProgress, 'updatedAt' | 'completed'>) {
  const completed = p.page >= p.pageCount - 1;
  const prev = await db.progress.get(p.bookId);
  await db.progress.put({
    ...p,
    // Uma vez concluído, voltar páginas não desmarca.
    completed: completed || (prev?.completed ?? false),
    updatedAt: Date.now(),
  });
}

export async function setCompleted(
  book: { id: string; seriesId: string; pageCount: number },
  completed: boolean,
) {
  await db.progress.put({
    bookId: book.id,
    seriesId: book.seriesId,
    pageCount: book.pageCount,
    page: completed ? Math.max(0, book.pageCount - 1) : 0,
    completed,
    updatedAt: Date.now(),
  });
}

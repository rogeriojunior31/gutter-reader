import type { Collection, ComicInfo, ReaderSettings, ReadProgress } from '@gutter/core';
import { Dexie, type EntityTable } from 'dexie';

export interface StoredProgress extends ReadProgress {
  /** Desnormalizado para "lido recentemente" por série sem consultar a Source. */
  seriesId: string;
  pageCount: number;
}

export interface SeriesPrefs {
  seriesId: string;
  settings: Partial<ReaderSettings>;
}

export interface KeyValue {
  key: string;
  value: unknown;
}

export interface CachedThumb {
  bookId: string;
  blob: Blob;
  createdAt: number;
}

export interface SavedDirectory {
  id: string;
  name: string;
  handle: FileSystemDirectoryHandle;
  addedAt: number;
}

export const db = new Dexie('gutter') as Dexie & {
  progress: EntityTable<StoredProgress, 'bookId'>;
  seriesPrefs: EntityTable<SeriesPrefs, 'seriesId'>;
  kv: EntityTable<KeyValue, 'key'>;
  /** Fase 1.1: thumbnails do LocalSource. */
  thumbs: EntityTable<CachedThumb, 'bookId'>;
  /** Fase 1.1: handles do showDirectoryPicker(). */
  directories: EntityTable<SavedDirectory, 'id'>;
  /** Locais por enquanto; a fase 2 sincroniza com o servidor. */
  collections: EntityTable<Collection, 'id'>;
  bookMeta: EntityTable<BookMeta, 'bookId'>;
  readingLog: EntityTable<ReadingLogEntry, 'key'>;
};

export interface ReadingLogEntry {
  /** `${date}|${bookId}` */
  key: string;
  /** AAAA-MM-DD no fuso local. */
  date: string;
  bookId: string;
  seriesId: string;
  /** Desnormalizados para o histórico não depender da fonte estar aberta. */
  bookTitle: string;
  seriesName: string;
  pages: number;
  updatedAt: number;
}

export interface BookMeta {
  bookId: string;
  pageCount: number;
  comicInfo?: ComicInfo;
}

db.version(1).stores({
  progress: 'bookId, seriesId, updatedAt',
  seriesPrefs: 'seriesId',
  kv: 'key',
  thumbs: 'bookId',
  directories: 'id',
});

// v2: coleções. `*seriesIds` = índice multi-valor ("em quais coleções esta série está?").
db.version(2).stores({
  collections: 'id, updatedAt, *seriesIds',
});

// v3: o que já descobrimos ao abrir cada livro local (evita reabrir só para contar páginas).
db.version(3).stores({
  bookMeta: 'bookId',
});

// v4: páginas lidas por dia e por livro (aba Leituras, sequência, meta diária).
db.version(4).stores({
  readingLog: 'key, date, bookId',
});

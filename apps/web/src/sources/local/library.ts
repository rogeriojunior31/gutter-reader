import {
  type Book,
  type BookFormat,
  bookFormat,
  fnv1a64,
  isJunkPath,
  localBookHash,
  naturalCompare,
  parseBookFilename,
  type Series,
} from '@gutter/core';

/** Um arquivo da pasta escolhida, independente de como foi lido (handle ou <input>). */
export interface LocalFile {
  /** Caminho relativo à raiz, com "/". */
  path: string;
  size: number;
  mtime: number;
  getFile(): Promise<File>;
}

/** Formatos que o worker já decodifica. */
export const SUPPORTED: ReadonlySet<BookFormat> = new Set(['cbz', 'cbr']);

export interface LocalLibrary {
  series: Series[];
  books: Map<string, Book>;
  booksBySeries: Map<string, Book[]>;
  files: Map<string, LocalFile>;
  /** Livros encontrados em formatos que ainda não lemos (ex.: PDF, CB7). */
  skipped: { path: string; format: BookFormat }[];
}

/**
 * Monta séries e livros a partir dos arquivos: cada pasta que contém livros é uma
 * série (nome = última parte do caminho); cada arquivo é um livro. Séries dentro de
 * uma subpasta ganham a estante dela (`HQS/DC/Demon Knights` → estante "DC").
 * `pageCounts` vem do cache (0 = ainda não aberto).
 */
export function buildLibrary(
  rootName: string,
  files: readonly LocalFile[],
  pageCounts: ReadonlyMap<string, number> = new Map(),
): LocalLibrary {
  const byDir = new Map<string, LocalFile[]>();
  const skipped: LocalLibrary['skipped'] = [];

  for (const f of files) {
    if (isJunkPath(f.path)) continue;
    const format = bookFormat(f.path);
    if (!format) continue;
    if (!SUPPORTED.has(format)) {
      skipped.push({ path: f.path, format });
      continue;
    }
    const dir = f.path.includes('/') ? f.path.slice(0, f.path.lastIndexOf('/')) : '';
    byDir.set(dir, [...(byDir.get(dir) ?? []), f]);
  }

  const lib: LocalLibrary = {
    series: [],
    books: new Map(),
    booksBySeries: new Map(),
    files: new Map(),
    skipped,
  };

  for (const [dir, dirFiles] of byDir) {
    const parts = dir ? dir.split('/') : [];
    const seriesName = parts.at(-1) ?? rootName;
    const seriesId = `local-${fnv1a64(`${rootName}/${dir}`).slice(0, 12)}`;

    const books = dirFiles
      .map((f): Book => {
        const parsed = parseBookFilename(f.path);
        const hash = localBookHash(`${rootName}/${f.path}`, f.size, f.mtime);
        const book: Book = {
          id: hash,
          hash,
          seriesId,
          title: parsed.title,
          format: bookFormat(f.path) as BookFormat,
          pageCount: pageCounts.get(hash) ?? 0,
          size: f.size,
          mtime: f.mtime,
        };
        if (parsed.number !== undefined) book.number = parsed.number;
        lib.files.set(hash, f);
        return book;
      })
      .sort(
        (a, b) =>
          (a.number ?? Number.POSITIVE_INFINITY) - (b.number ?? Number.POSITIVE_INFINITY) ||
          naturalCompare(a.title, b.title),
      );

    for (const b of books) lib.books.set(b.id, b);
    lib.booksBySeries.set(seriesId, books);

    const years = dirFiles
      .map((f) => parseBookFilename(f.path).year)
      .filter((y): y is number => y !== undefined);
    const series: Series = {
      id: seriesId,
      name: seriesName,
      bookCount: books.length,
      addedAt: Math.max(...dirFiles.map((f) => f.mtime)),
    };
    if (books[0]) series.coverBookId = books[0].id;
    if (parts.length >= 2 && parts[0]) series.shelf = parts[0];
    // Sem ComicInfo, só o ano sai do nome do arquivo; sem "provider" para não sugerir curadoria.
    if (years.length) series.metadata = { year: Math.min(...years) };
    lib.series.push(series);
  }

  lib.series.sort((a, b) => naturalCompare(a.name, b.name));
  return lib;
}

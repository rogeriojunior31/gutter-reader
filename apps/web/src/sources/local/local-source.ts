import type { Book, PageInfo, RequestOptions, Series, Source } from '@gutter/core';
import { type BookRef, createDecoderWorker, DecoderClient } from '@gutter/workers';
import { db } from '../../db/db.ts';
import { buildLibrary, type LocalFile, type LocalLibrary } from './library.ts';

const THUMB_WIDTH = 300;
/** Capas geradas em paralelo: cada uma abre um arquivo inteiro no worker. */
const THUMB_CONCURRENCY = 2;

let client: DecoderClient | undefined;
/** Um worker para o app inteiro, criado só quando uma pasta local é usada. */
function decoder(): DecoderClient {
  client ??= new DecoderClient(createDecoderWorker());
  return client;
}

/**
 * Biblioteca lida de uma pasta do computador. A varredura só olha nomes, tamanhos
 * e datas; o conteúdo dos arquivos é aberto sob demanda no worker.
 */
export class LocalSource implements Source {
  readonly kind = 'local' as const;
  readonly #lib: LocalLibrary;
  readonly #pages = new Map<string, Promise<PageInfo[]>>();
  readonly #thumbQueue = new Limiter(THUMB_CONCURRENCY);

  private constructor(
    readonly rootName: string,
    lib: LocalLibrary,
  ) {
    this.#lib = lib;
  }

  /** Monta a fonte usando o que já sabemos dos livros (contagem de páginas). */
  static async create(rootName: string, files: LocalFile[]): Promise<LocalSource> {
    const metas = await db.bookMeta.toArray();
    const counts = new Map(metas.map((m) => [m.bookId, m.pageCount]));
    return new LocalSource(rootName, buildLibrary(rootName, files, counts));
  }

  /** Arquivos encontrados em formatos que ainda não lemos. */
  get skipped() {
    return this.#lib.skipped;
  }

  async listSeries(): Promise<Series[]> {
    return this.#lib.series;
  }

  async getSeries(seriesId: string): Promise<Series> {
    const s = this.#lib.series.find((x) => x.id === seriesId);
    if (!s) throw new Error('Esta série não está mais na pasta escolhida.');
    return s;
  }

  async listBooks(seriesId: string): Promise<Book[]> {
    return this.#lib.booksBySeries.get(seriesId) ?? [];
  }

  async getBook(bookId: string): Promise<Book> {
    const b = this.#lib.books.get(bookId);
    if (!b) throw new Error('Este livro não está mais na pasta escolhida.');
    return b;
  }

  listPages(bookId: string, opts?: RequestOptions): Promise<PageInfo[]> {
    let p = this.#pages.get(bookId);
    if (!p) {
      p = this.#ref(bookId)
        .then((ref) => decoder().open(ref, opts?.signal))
        .then(async (res) => {
          if (res.pages.length === 0) {
            throw new Error('Nenhuma imagem encontrada dentro deste arquivo.');
          }
          const book = this.#lib.books.get(bookId);
          if (book) book.pageCount = res.pages.length;
          await db.bookMeta.put(
            res.comicInfo
              ? { bookId, pageCount: res.pages.length, comicInfo: res.comicInfo }
              : { bookId, pageCount: res.pages.length },
          );
          return res.pages;
        });
      this.#pages.set(bookId, p);
      // Falhou (ou foi cancelado): a próxima tentativa abre de novo.
      p.catch(() => this.#pages.delete(bookId));
    }
    return p;
  }

  async getPage(bookId: string, index: number, opts?: RequestOptions): Promise<Blob> {
    return decoder().page(await this.#ref(bookId), index, opts?.signal);
  }

  async getThumbnail(bookId: string, opts?: RequestOptions): Promise<Blob> {
    const cached = await db.thumbs.get(bookId);
    if (cached) return cached.blob;
    const blob = await this.#thumbQueue.run(async () => {
      opts?.signal?.throwIfAborted();
      return decoder().thumbnail(await this.#ref(bookId), 0, THUMB_WIDTH, opts?.signal);
    });
    await db.thumbs.put({ bookId, blob, createdAt: Date.now() });
    return blob;
  }

  async #ref(bookId: string): Promise<BookRef> {
    const book = this.#lib.books.get(bookId);
    const file = this.#lib.files.get(bookId);
    if (!book || !file) throw new Error('Este livro não está mais na pasta escolhida.');
    try {
      return { bookId, format: book.format, file: await file.getFile() };
    } catch {
      throw new Error(
        `Não deu para ler "${file.path}". O arquivo foi movido, apagado ou a permissão expirou.`,
      );
    }
  }
}

/** Fila simples: no máximo `max` tarefas ao mesmo tempo. */
class Limiter {
  #active = 0;
  #queue: (() => void)[] = [];
  constructor(private readonly max: number) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.#active >= this.max) {
      await new Promise<void>((resolve) => this.#queue.push(resolve));
    }
    this.#active++;
    try {
      return await task();
    } finally {
      this.#active--;
      this.#queue.shift()?.();
    }
  }
}

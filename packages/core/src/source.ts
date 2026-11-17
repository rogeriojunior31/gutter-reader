import type { Book, PageInfo, Series } from './types.ts';

export interface RequestOptions {
  signal?: AbortSignal;
}

/**
 * Fonte de dados da biblioteca. O Reader só conversa com esta interface.
 * Implementações: MockSource (protótipo), LocalSource (fase 1), RemoteSource (fase 2).
 */
export interface Source {
  readonly kind: 'mock' | 'local' | 'remote';
  listSeries(opts?: RequestOptions): Promise<Series[]>;
  getSeries(seriesId: string, opts?: RequestOptions): Promise<Series>;
  listBooks(seriesId: string, opts?: RequestOptions): Promise<Book[]>;
  getBook(bookId: string, opts?: RequestOptions): Promise<Book>;
  listPages(bookId: string, opts?: RequestOptions): Promise<PageInfo[]>;
  /** Devolve a imagem decodificada da página. Quem chama é dono do Blob. */
  getPage(bookId: string, index: number, opts?: RequestOptions): Promise<Blob>;
  getThumbnail(bookId: string, opts?: RequestOptions): Promise<Blob>;
}

/** Recorte da Source que o Reader precisa: só páginas de um livro. */
export type PageSource = Pick<Source, 'getPage'>;

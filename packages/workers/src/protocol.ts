import type { BookFormat, ComicInfo, PageInfo } from '@gutter/core';

/** Livro como o worker precisa: id estável + formato + o arquivo (clonar File é barato). */
export interface BookRef {
  bookId: string;
  format: BookFormat;
  file: Blob;
}

/** Mensagens main thread → worker. Toda requisição tem um `id` para casar com a resposta. */
export type WorkerRequest =
  | ({ id: number; type: 'open' } & BookRef)
  | ({ id: number; type: 'page'; index: number } & BookRef)
  | ({ id: number; type: 'thumbnail'; index: number; width: number } & BookRef)
  | { id: number; type: 'close'; bookId: string }
  | { id: number; type: 'cancel'; target: number };

export interface OpenResult {
  pages: PageInfo[];
  comicInfo?: ComicInfo;
}

export type WorkerResult = OpenResult | Blob | null;

export type WorkerResponse =
  | { id: number; ok: true; result: WorkerResult }
  | { id: number; ok: false; error: string; aborted?: boolean };

/** Contrato que cada decodificador (zip, rar, pdf) implementa dentro do worker. */
export interface Decoder {
  open(file: Blob): Promise<OpenResult>;
  page(index: number, signal: AbortSignal): Promise<Blob>;
  close(): Promise<void>;
}

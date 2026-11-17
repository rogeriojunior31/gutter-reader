/// <reference lib="webworker" />
import type { BookFormat } from '@gutter/core';
import { RarDecoder } from './decoders/rar.ts';
import { ZipDecoder } from './decoders/zip.ts';
import type { BookRef, Decoder, OpenResult, WorkerRequest, WorkerResponse } from './protocol.ts';

/**
 * Worker único de decodificação. Abre livros sob demanda e mantém os mais
 * recentes abertos (LRU): RAR fica inteiro na memória, então o limite é baixo.
 */
declare const self: DedicatedWorkerGlobalScope;

const MAX_OPEN = 3;

interface OpenBook {
  decoder: Decoder;
  ready: Promise<OpenResult>;
  /** Operações em andamento: um livro ocupado nunca é fechado pelo LRU. */
  busy: number;
}

const books = new Map<string, OpenBook>(); // ordem de inserção = LRU
const inflight = new Map<number, AbortController>();

function createDecoder(format: BookFormat): Decoder {
  switch (format) {
    case 'cbz':
      return new ZipDecoder();
    case 'cbr':
      return new RarDecoder();
    default:
      throw new Error(`formato ${format.toUpperCase()} ainda não é suportado`);
  }
}

/** Abre (uma vez só, mesmo com pedidos simultâneos) e marca como usado agora. */
function ensure(ref: BookRef): OpenBook {
  let book = books.get(ref.bookId);
  if (book) {
    books.delete(ref.bookId);
    books.set(ref.bookId, book);
    return book;
  }
  const decoder = createDecoder(ref.format);
  book = { decoder, ready: decoder.open(ref.file), busy: 0 };
  books.set(ref.bookId, book);
  // Falhou ao abrir: não deixa no cache, a próxima tentativa recomeça.
  book.ready.catch(() => {
    if (books.get(ref.bookId) === book) books.delete(ref.bookId);
  });
  evict();
  return book;
}

/** Fecha os menos usados acima do limite, pulando os que estão ocupados. */
function evict() {
  for (const [id, book] of books) {
    if (books.size <= MAX_OPEN) break;
    if (book.busy > 0) continue;
    books.delete(id);
    void book.ready.then(
      () => book.decoder.close(),
      () => {},
    );
  }
}

/** Roda `fn` com o livro marcado como ocupado. */
async function using<T>(book: OpenBook, fn: (d: Decoder) => Promise<T>): Promise<T> {
  book.busy++;
  try {
    await book.ready;
    return await fn(book.decoder);
  } finally {
    book.busy--;
  }
}

/**
 * Capa: usa o livro se já estiver aberto para leitura; senão abre um decoder
 * temporário, fora do LRU. Gerar 24 capas não pode expulsar o livro que você lê.
 */
async function thumbnailPage(ref: BookRef, index: number, signal: AbortSignal): Promise<Blob> {
  const open = books.get(ref.bookId);
  if (open) return using(open, (d) => d.page(index, signal));
  const decoder = createDecoder(ref.format);
  try {
    await decoder.open(ref.file);
    return await decoder.page(index, signal);
  } finally {
    await decoder.close();
  }
}

/** Primeira página reduzida para capa: largura fixa, WebP. */
async function thumbnail(blob: Blob, width: number): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  try {
    const scale = Math.min(1, width / bitmap.width);
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2d indisponível no worker');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, w, h);
    return await canvas.convertToBlob({ type: 'image/webp', quality: 0.82 });
  } finally {
    bitmap.close();
  }
}

function reply(msg: WorkerResponse) {
  self.postMessage(msg);
}

self.addEventListener('message', async (ev: MessageEvent<WorkerRequest>) => {
  const req = ev.data;
  if (req.type === 'cancel') {
    inflight.get(req.target)?.abort();
    return;
  }

  const ctrl = new AbortController();
  inflight.set(req.id, ctrl);
  try {
    switch (req.type) {
      case 'open': {
        reply({ id: req.id, ok: true, result: await ensure(req).ready });
        break;
      }
      case 'page': {
        const page = await using(ensure(req), (d) => d.page(req.index, ctrl.signal));
        reply({ id: req.id, ok: true, result: page });
        break;
      }
      case 'thumbnail': {
        const page = await thumbnailPage(req, req.index, ctrl.signal);
        reply({ id: req.id, ok: true, result: await thumbnail(page, req.width) });
        break;
      }
      case 'close': {
        const book = books.get(req.bookId);
        books.delete(req.bookId);
        await book?.ready.then(
          () => book.decoder.close(),
          () => {},
        );
        reply({ id: req.id, ok: true, result: null });
        break;
      }
    }
  } catch (err) {
    reply({
      id: req.id,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      aborted: ctrl.signal.aborted,
    });
  } finally {
    inflight.delete(req.id);
  }
});

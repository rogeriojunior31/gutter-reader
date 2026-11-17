import type {
  BookRef,
  OpenResult,
  WorkerRequest,
  WorkerResponse,
  WorkerResult,
} from './protocol.ts';

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type Pending = { resolve: (r: WorkerResult) => void; reject: (e: Error) => void };

/** Porta mínima que o client usa; permite testar sem um Worker real. */
export interface WorkerPort {
  postMessage(msg: WorkerRequest): void;
  addEventListener(type: 'message', fn: (ev: MessageEvent<WorkerResponse>) => void): void;
  terminate?(): void;
}

/**
 * RPC sobre postMessage. Cada chamada vira uma Promise; AbortSignal envia `cancel`
 * para o worker e rejeita com AbortError.
 */
export class DecoderClient {
  #nextId = 1;
  #pending = new Map<number, Pending>();

  constructor(private readonly port: WorkerPort) {
    port.addEventListener('message', (ev) => {
      const msg = ev.data;
      const p = this.#pending.get(msg.id);
      if (!p) return;
      this.#pending.delete(msg.id);
      if (msg.ok) p.resolve(msg.result);
      else p.reject(msg.aborted ? abortError() : new Error(msg.error));
    });
  }

  open(book: BookRef, signal?: AbortSignal): Promise<OpenResult> {
    return this.#call({ type: 'open', ...book }, signal) as Promise<OpenResult>;
  }

  page(book: BookRef, index: number, signal?: AbortSignal): Promise<Blob> {
    return this.#call({ type: 'page', ...book, index }, signal) as Promise<Blob>;
  }

  /** Página `index` reduzida para `width` px (WebP), feita no worker. */
  thumbnail(book: BookRef, index: number, width: number, signal?: AbortSignal): Promise<Blob> {
    return this.#call({ type: 'thumbnail', ...book, index, width }, signal) as Promise<Blob>;
  }

  async close(bookId: string): Promise<void> {
    await this.#call({ type: 'close', bookId });
  }

  terminate(): void {
    this.port.terminate?.();
    for (const p of this.#pending.values()) p.reject(new Error('worker terminated'));
    this.#pending.clear();
  }

  #call(req: DistributiveOmit<WorkerRequest, 'id'>, signal?: AbortSignal): Promise<WorkerResult> {
    if (signal?.aborted) return Promise.reject(abortError());
    const id = this.#nextId++;
    return new Promise<WorkerResult>((resolve, reject) => {
      this.#pending.set(id, { resolve, reject });
      signal?.addEventListener(
        'abort',
        () => {
          if (!this.#pending.delete(id)) return;
          this.port.postMessage({ id: this.#nextId++, type: 'cancel', target: id });
          reject(abortError());
        },
        { once: true },
      );
      this.port.postMessage({ ...req, id } as WorkerRequest);
    });
  }
}

function abortError(): Error {
  return new DOMException('Aborted', 'AbortError');
}

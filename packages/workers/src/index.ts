export { DecoderClient, type WorkerPort } from './client.ts';
export type * from './protocol.ts';

/** Cria o worker de decodificação. O `new URL(..., import.meta.url)` é resolvido pelo Vite. */
export function createDecoderWorker(): Worker {
  return new Worker(new URL('./decoder.worker.ts', import.meta.url), {
    type: 'module',
    name: 'gutter-decoder',
  });
}

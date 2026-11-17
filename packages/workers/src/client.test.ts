import { describe, expect, it } from 'vitest';
import { DecoderClient, type WorkerPort } from './client.ts';
import type { BookRef, WorkerRequest, WorkerResponse } from './protocol.ts';

const ref: BookRef = { bookId: 'b1', format: 'cbz', file: new Blob() };

function fakePort() {
  const sent: WorkerRequest[] = [];
  let listener: ((ev: MessageEvent<WorkerResponse>) => void) | undefined;
  const port: WorkerPort = {
    postMessage: (m) => sent.push(m),
    addEventListener: (_t, fn) => {
      listener = fn;
    },
  };
  const respond = (msg: WorkerResponse) =>
    listener?.({ data: msg } as MessageEvent<WorkerResponse>);
  return { port, sent, respond };
}

describe('DecoderClient', () => {
  it('casa resposta pelo id', async () => {
    const { port, sent, respond } = fakePort();
    const client = new DecoderClient(port);
    const p = client.page(ref, 3);
    const req = sent[0];
    expect(req).toMatchObject({ type: 'page', bookId: 'b1', index: 3 });
    const blob = new Blob(['x']);
    respond({ id: req?.id ?? -1, ok: true, result: blob });
    await expect(p).resolves.toBe(blob);
  });

  it('cancela com AbortSignal', async () => {
    const { port, sent } = fakePort();
    const client = new DecoderClient(port);
    const ctrl = new AbortController();
    const p = client.page(ref, 0, ctrl.signal);
    ctrl.abort();
    await expect(p).rejects.toMatchObject({ name: 'AbortError' });
    expect(sent[1]).toMatchObject({ type: 'cancel', target: sent[0]?.id });
  });

  it('propaga erro do worker', async () => {
    const { port, sent, respond } = fakePort();
    const client = new DecoderClient(port);
    const p = client.page(ref, 0);
    respond({ id: sent[0]?.id ?? -1, ok: false, error: 'boom' });
    await expect(p).rejects.toThrow('boom');
  });
});

import type { PageInfo } from '@gutter/core';
import { describe, expect, it } from 'vitest';
import { PageCache, windowAround } from './page-cache.ts';
import { buildViews, viewIndexByPage } from './spreads.ts';

const portrait = (index: number): PageInfo => ({
  index,
  name: `${index + 1}.jpg`,
  width: 800,
  height: 1200,
  mediaType: 'image/jpeg',
});
const wide = (index: number): PageInfo => ({ ...portrait(index), width: 1600 });

describe('buildViews', () => {
  it('single: uma página por vista', () => {
    expect(buildViews([0, 1, 2].map(portrait), 'single', true)).toEqual([[0], [1], [2]]);
  });

  it('double com capa sozinha', () => {
    const pages = [0, 1, 2, 3, 4].map(portrait);
    expect(buildViews(pages, 'double', true)).toEqual([[0], [1, 2], [3, 4]]);
    expect(buildViews(pages, 'double', false)).toEqual([[0, 1], [2, 3], [4]]);
  });

  it('spread largo fica sozinho e não quebra pares seguintes', () => {
    const pages = [portrait(0), portrait(1), portrait(2), wide(3), portrait(4), portrait(5)];
    const views = buildViews(pages, 'double', true);
    expect(views).toEqual([[0], [1, 2], [3], [4, 5]]);
    expect(viewIndexByPage(views, 6)).toEqual([0, 1, 1, 2, 3, 3]);
  });

  it('página ímpar antes de um spread fica sozinha', () => {
    const pages = [portrait(0), portrait(1), portrait(2), wide(3)];
    expect(buildViews(pages, 'double', false)).toEqual([[0, 1], [2], [3]]);
  });
});

describe('windowAround', () => {
  it('respeita limites', () => {
    expect(windowAround(0, 2, 10)).toEqual([0, 1, 2]);
    expect(windowAround(9, 2, 10)).toEqual([7, 8, 9]);
  });
});

describe('PageCache', () => {
  const setup = () => {
    const revoked: string[] = [];
    const aborted: number[] = [];
    const resolvers = new Map<number, (b: Blob) => void>();
    const cache = new PageCache(
      (i, signal) =>
        new Promise<Blob>((resolve) => {
          resolvers.set(i, resolve);
          signal.addEventListener('abort', () => aborted.push(i));
        }),
      { createUrl: () => `blob:${Math.random()}`, revokeUrl: (u) => revoked.push(u) },
    );
    const flush = () => new Promise((r) => setTimeout(r, 0));
    return { cache, revoked, aborted, resolvers, flush };
  };

  it('revoga URLs fora da janela e aborta carregamentos pendentes', async () => {
    const { cache, revoked, aborted, resolvers, flush } = setup();
    cache.setWindow([0, 1, 2]);
    resolvers.get(0)?.(new Blob());
    resolvers.get(1)?.(new Blob());
    await flush();
    const url0 = cache.get(0);
    expect(url0?.status).toBe('ready');

    cache.setWindow([2, 3]);
    expect(cache.size).toBe(2);
    expect(revoked).toHaveLength(2);
    expect(revoked).toContain(url0?.status === 'ready' ? url0.url : '');
    expect(aborted).toEqual([]);

    cache.setWindow([10]);
    expect(aborted.sort()).toEqual([2, 3]);
  });

  it('ignora resultado que chega depois de sair da janela', async () => {
    const { cache, revoked, resolvers, flush } = setup();
    cache.setWindow([0]);
    const resolve0 = resolvers.get(0);
    cache.setWindow([5]);
    resolve0?.(new Blob());
    await flush();
    expect(cache.get(0)).toBeUndefined();
    expect(revoked).toHaveLength(0);
  });

  it('release revoga tudo e aborta o que carregava', async () => {
    const { cache, revoked, aborted, resolvers, flush } = setup();
    cache.setWindow([0, 1]);
    resolvers.get(0)?.(new Blob());
    await flush();
    cache.release();
    expect(revoked).toHaveLength(1);
    expect(aborted).toEqual([1]);
    expect(cache.size).toBe(0);
  });

  // Regressão: o StrictMode faz efeito → cleanup → efeito na mesma instância.
  // Antes, o cleanup "descartava" o cache para sempre e o leitor ficava no spinner.
  it('volta a carregar depois de release (sequência do StrictMode)', async () => {
    const { cache, resolvers, flush } = setup();
    cache.setWindow([0]);
    cache.release();
    cache.setWindow([0]);
    expect(cache.get(0)?.status).toBe('loading');
    resolvers.get(0)?.(new Blob());
    await flush();
    expect(cache.get(0)?.status).toBe('ready');
  });

  it('retry reinicia uma página com erro', async () => {
    let calls = 0;
    const cache = new PageCache(
      () => {
        calls++;
        return calls === 1 ? Promise.reject(new Error('falhou')) : Promise.resolve(new Blob());
      },
      { createUrl: () => 'blob:x', revokeUrl: () => {} },
    );
    cache.setWindow([0]);
    await new Promise((r) => setTimeout(r, 0));
    expect(cache.get(0)?.status).toBe('error');
    cache.retry(0);
    await new Promise((r) => setTimeout(r, 0));
    expect(cache.get(0)?.status).toBe('ready');
    expect(calls).toBe(2);
  });
});

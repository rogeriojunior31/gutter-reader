import type { PageSource } from '@gutter/core';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { PageCache } from './page-cache.ts';

/** Cria um PageCache por livro e mantém a janela sincronizada com `indices`. */
export function usePageCache(source: PageSource, bookId: string, indices: readonly number[]) {
  const [cache, setCache] = useState(() => makeCache(source, bookId));
  const [key, setKey] = useState({ source, bookId });

  if (key.source !== source || key.bookId !== bookId) {
    setKey({ source, bookId });
    setCache(makeCache(source, bookId));
  }

  // Libera as páginas ao trocar de livro/desmontar. `release` (e não um dispose
  // definitivo) porque o StrictMode roda cleanup + efeito de novo na mesma instância:
  // o efeito de janela abaixo também re-roda e recarrega.
  useEffect(() => () => cache.release(), [cache]);

  const windowKey = indices.join(',');
  // biome-ignore lint/correctness/useExhaustiveDependencies: windowKey representa `indices`
  useEffect(() => {
    cache.setWindow(indices);
  }, [cache, windowKey]);

  useSyncExternalStore(
    (fn) => cache.subscribe(fn),
    () => cache.version,
  );
  return cache;
}

function makeCache(source: PageSource, bookId: string) {
  return new PageCache((index, signal) => source.getPage(bookId, index, { signal }));
}

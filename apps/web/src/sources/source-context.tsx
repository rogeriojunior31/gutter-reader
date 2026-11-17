import type { Source } from '@gutter/core';
import { useSourceStore } from './source-store.ts';

/** A Source ativa da sessão. Trocar Demo → Pasta → Servidor não muda nenhuma tela. */
export function useSource(): Source {
  return useSourceStore((s) => s.source);
}

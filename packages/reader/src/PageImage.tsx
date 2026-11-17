import type { PageInfo } from '@gutter/core';
import { type CSSProperties, useEffect, useState } from 'react';
import type { PageEntry } from './page-cache.ts';

interface Props {
  page: PageInfo;
  entry: PageEntry | undefined;
  onRetry: () => void;
  className?: string;
  style?: CSSProperties;
}

/** Depois disso, o carregamento ganha aviso e botão de tentar de novo. */
const SLOW_MS = 8000;

/** Imagem da página com placeholder no tamanho certo enquanto carrega. */
export function PageImage({ page, entry, onRetry, className = '', style }: Props) {
  const aspect = page.width && page.height ? `${page.width} / ${page.height}` : '2 / 3';
  const slow = useSlow(entry?.status !== 'ready' && entry?.status !== 'error', page.index);

  if (entry?.status === 'ready') {
    return (
      <img
        src={entry.url}
        alt={`Página ${page.index + 1}`}
        draggable={false}
        className={`select-none ${className}`}
        style={style}
      />
    );
  }

  const failed = entry?.status === 'error';
  return (
    <div
      role={failed ? 'alert' : 'status'}
      className={`flex flex-col items-center justify-center gap-3 bg-ink-850 px-6 text-center text-ink-200 text-sm ${className}`}
      style={{ aspectRatio: aspect, ...style }}
    >
      {failed || slow ? (
        <>
          <p>
            {failed
              ? `Não deu para abrir a página ${page.index + 1}.`
              : `A página ${page.index + 1} está demorando.`}
          </p>
          {failed && <p className="max-w-xs text-ink-300 text-xs">{entry.error.message}</p>}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation(); // não conta como toque de virar página
              onRetry();
            }}
            className="rounded-lg bg-white/10 px-4 py-2.5 font-medium text-white hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-gold-400"
          >
            Tentar de novo
          </button>
        </>
      ) : (
        <span className="sr-only">Carregando página {page.index + 1}</span>
      )}
      {!failed && !slow && (
        <span className="size-6 animate-spin rounded-full border-2 border-ink-700 border-t-ink-200 motion-reduce:animate-none" />
      )}
    </div>
  );
}

function useSlow(loading: boolean, key: number) {
  const [slow, setSlow] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: reinicia ao trocar de página
  useEffect(() => {
    setSlow(false);
    if (!loading) return;
    const t = setTimeout(() => setSlow(true), SLOW_MS);
    return () => clearTimeout(t);
  }, [loading, key]);
  return slow;
}

import type { PageInfo } from '@gutter/core';
import { useVirtualizer } from '@tanstack/react-virtual';
import { type RefObject, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { PageImage } from './PageImage.tsx';
import type { PageCache } from './page-cache.ts';

export interface WebtoonHandle {
  /** Rola uma fração da altura visível (positivo = para baixo). */
  scrollByViewport(fraction: number): void;
}

interface Props {
  pages: readonly PageInfo[];
  page: number;
  cache: PageCache;
  onPageChange: (page: number) => void;
  onTap: () => void;
  handle: RefObject<WebtoonHandle | null>;
}

const MAX_COLUMN = 800;
/** Linha de leitura: a página "atual" é a que cruza 30% da altura da tela. */
const READ_LINE = 0.3;

export function WebtoonView({ pages, page, cache, onPageChange, onTap, handle }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(MAX_COLUMN);
  // -1 força o scroll inicial até `page` (retomar leitura).
  const reported = useRef(-1);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.min(entry.contentRect.width, MAX_COLUMN));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const virtualizer = useVirtualizer({
    count: pages.length,
    getScrollElement: () => scroller.current,
    estimateSize: (i) => {
      const p = pages[i];
      return p?.width && p.height ? Math.round((width * p.height) / p.width) : width * 1.5;
    },
    overscan: 2,
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: largura muda todas as alturas
  useEffect(() => {
    virtualizer.measure();
  }, [width]);

  // Navegação externa (scrubber, retomar progresso) → rola até a página.
  useEffect(() => {
    if (page === reported.current) return;
    reported.current = page;
    virtualizer.scrollToIndex(page, { align: 'start' });
  }, [page, virtualizer]);

  useImperativeHandle(handle, () => ({
    scrollByViewport(fraction) {
      const el = scroller.current;
      el?.scrollBy({ top: el.clientHeight * fraction, behavior: 'smooth' });
    },
  }));

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const line = el.scrollTop + el.clientHeight * READ_LINE;
    const item = virtualizer.getVirtualItemForOffset(line);
    if (item && item.index !== reported.current) {
      reported.current = item.index;
      onPageChange(item.index);
    }
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: teclado é tratado globalmente pelo Reader
    // biome-ignore lint/a11y/noStaticElementInteractions: toque alterna as barras
    <div
      ref={scroller}
      className="absolute inset-0 overflow-y-auto overflow-x-hidden"
      onScroll={onScroll}
      onClick={onTap}
    >
      <div className="relative mx-auto" style={{ height: virtualizer.getTotalSize(), width }}>
        {virtualizer.getVirtualItems().map((item) => {
          const p = pages[item.index];
          if (!p) return null;
          return (
            <div
              key={item.key}
              className="absolute left-0 w-full"
              style={{ top: item.start, height: item.size }}
            >
              <PageImage
                page={p}
                entry={cache.get(item.index)}
                onRetry={() => cache.retry(item.index)}
                className="block h-full w-full"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

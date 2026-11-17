import type { FitMode, PageInfo, ReadingDirection } from '@gutter/core';
import { useLayoutEffect, useRef } from 'react';
import { PageImage } from './PageImage.tsx';
import type { PageCache } from './page-cache.ts';

interface Props {
  pages: readonly PageInfo[];
  view: readonly number[];
  fit: FitMode;
  direction: ReadingDirection;
  cache: PageCache;
  onTap: (zone: 'left' | 'center' | 'right') => void;
}

const INNER: Record<FitMode, string> = {
  screen: 'h-full w-full items-center',
  height: 'h-full min-w-full w-max items-center',
  width: 'min-h-full w-full items-start',
  original: 'min-h-full min-w-full w-max items-center',
};

function imageClass(fit: FitMode, double: boolean): string {
  switch (fit) {
    case 'screen':
      return double
        ? 'max-h-full max-w-[50%] object-contain'
        : 'max-h-full max-w-full object-contain';
    case 'height':
      return 'h-full w-auto max-w-none';
    case 'width':
      return double ? 'w-1/2 h-auto' : 'w-full h-auto';
    case 'original':
      return 'max-w-none';
  }
}

export function PagedView({ pages, view, fit, direction, cache, onTap }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const double = view.length > 1;
  const viewKey = view.join('-');

  // Cada vista nova começa no topo (e no início da leitura, à direita no RTL).
  // biome-ignore lint/correctness/useExhaustiveDependencies: reage à troca de vista
  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = 0;
    el.scrollLeft = direction === 'rtl' ? el.scrollWidth : 0;
  }, [viewKey, fit, direction]);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: teclado é tratado globalmente pelo Reader
    // biome-ignore lint/a11y/noStaticElementInteractions: tap zones
    <div
      ref={scroller}
      className="absolute inset-0 overflow-auto overscroll-none"
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        onTap(x < 1 / 3 ? 'left' : x > 2 / 3 ? 'right' : 'center');
      }}
    >
      <div
        className={`flex justify-center ${INNER[fit]} ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}
      >
        {view.map((index) => {
          const page = pages[index];
          if (!page) return null;
          return (
            <PageImage
              key={index}
              page={page}
              entry={cache.get(index)}
              onRetry={() => cache.retry(index)}
              className={`${imageClass(fit, double)} ${fit === 'screen' && cache.get(index)?.status !== 'ready' ? 'h-full' : ''}`}
            />
          );
        })}
      </div>
    </div>
  );
}

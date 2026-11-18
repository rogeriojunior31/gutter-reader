import type { FitMode, PageInfo, ReadingDirection } from '@gutter/core';
import { type RefObject, useLayoutEffect } from 'react';
import type { Camera } from './guided.ts';
import { PageImage } from './PageImage.tsx';
import type { PageCache } from './page-cache.ts';

interface Props {
  pages: readonly PageInfo[];
  view: readonly number[];
  fit: FitMode;
  direction: ReadingDirection;
  cache: PageCache;
  onTap: (zone: 'left' | 'center' | 'right') => void;
  /** Área rolável (a leitura guiada mede as páginas por ela). */
  scrollerRef: RefObject<HTMLDivElement | null>;
  /** Câmera da leitura guiada; `null` = página em repouso. */
  camera: Camera | null;
  /** Leitura guiada ligada: sem rolagem, a câmera é quem move. */
  guided: boolean;
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

export function PagedView({
  pages,
  view,
  fit,
  direction,
  cache,
  onTap,
  scrollerRef,
  camera,
  guided,
}: Props) {
  const double = view.length > 1;
  const viewKey = view.join('-');

  // Cada vista nova começa no topo (e no início da leitura, à direita no RTL).
  // Na leitura guiada a rolagem fica zerada: a câmera mede a partir dela.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reage à troca de vista
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = 0;
    el.scrollLeft = direction === 'rtl' && !guided ? el.scrollWidth : 0;
  }, [viewKey, fit, direction, guided]);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: teclado é tratado globalmente pelo Reader
    // biome-ignore lint/a11y/noStaticElementInteractions: tap zones
    <div
      ref={scrollerRef}
      className={`absolute inset-0 overscroll-none ${guided ? 'overflow-hidden' : 'overflow-auto'}`}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        onTap(x < 1 / 3 ? 'left' : x > 2 / 3 ? 'right' : 'center');
      }}
    >
      <div
        className={`relative flex origin-top-left justify-center transition-transform duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)] will-change-transform motion-reduce:transition-none ${INNER[fit]} ${direction === 'rtl' ? 'flex-row-reverse' : ''}`}
        style={
          camera && camera.scale !== 1
            ? { transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})` }
            : camera
              ? { transform: `translate(${camera.x}px, ${camera.y}px)` }
              : undefined
        }
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

import type { PageInfo, ReaderLayout } from '@gutter/core';

/** Página mais larga que alta é um spread e aparece sozinha na página dupla. */
export function isWide(page: PageInfo): boolean {
  return page.width !== undefined && page.height !== undefined && page.width > page.height;
}

/**
 * Agrupa as páginas em "vistas" (cada vista é o que aparece na tela de uma vez).
 * Na ordem de leitura; quem inverte para RTL é a camada de exibição.
 */
export function buildViews(
  pages: readonly PageInfo[],
  layout: ReaderLayout,
  coverAlone: boolean,
): number[][] {
  if (layout !== 'double') return pages.map((p) => [p.index]);

  const views: number[][] = [];
  let pending: number | undefined;
  const flush = () => {
    if (pending !== undefined) views.push([pending]);
    pending = undefined;
  };

  for (const [i, page] of pages.entries()) {
    if (isWide(page) || (i === 0 && coverAlone)) {
      flush();
      views.push([page.index]);
    } else if (pending === undefined) {
      pending = page.index;
    } else {
      views.push([pending, page.index]);
      pending = undefined;
    }
  }
  flush();
  return views;
}

/** Mapa página → índice da vista que a contém. */
export function viewIndexByPage(views: readonly number[][], pageCount: number): number[] {
  const map = new Array<number>(pageCount).fill(0);
  views.forEach((view, vi) => {
    for (const p of view) map[p] = vi;
  });
  return map;
}

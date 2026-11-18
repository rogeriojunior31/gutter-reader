import type { GuidedZoom } from '@gutter/core';
import type { BalloonRect } from './balloons.ts';

/** Uma parada da leitura guiada: um balão (ou bloco de texto) numa página. */
export interface GuidedStop {
  page: number;
  /** Retângulo normalizado na página; `null` = página inteira (sem balões). */
  rect: BalloonRect | null;
}

/** Caixa da página no conteúdo do leitor (px, com a página em repouso). */
export interface PageBox {
  left: number;
  top: number;
  width: number;
  height: number;
  /** Largura real da imagem, para não ampliar além da nitidez. */
  naturalWidth: number;
}

export interface Viewport {
  width: number;
  /** Altura útil (desconta a barra da leitura guiada). */
  height: number;
}

/** Deslocamento da página: só quando o balão está fora da tela (ajuste por largura). */
export interface Camera {
  scale: number;
  x: number;
  y: number;
}

/** A lupa: onde fica na tela e qual pedaço da página mostra, ampliado. */
export interface Lens {
  left: number;
  top: number;
  width: number;
  height: number;
  /** Ampliação em relação à página como está na tela. */
  zoom: number;
  /** Pedaço da página mostrado (normalizado). */
  src: BalloonRect;
  /** Página na tela (já com o deslocamento), para posicionar a imagem dentro da lupa. */
  page: { left: number; top: number; width: number; height: number };
}

/** Ampliação máxima em pixels da imagem original: acima disso fica borrado. */
const MAX_NATURAL = 2.2;
/** Celular: largura da lupa na tela. Tela larga: ampliação sobre a página. */
const NARROW_WIDTH: Record<GuidedZoom, number> = { soft: 0.6, medium: 0.74, strong: 0.92 };
const WIDE_ZOOM: Record<GuidedZoom, number> = { soft: 1.35, medium: 1.7, strong: 2.2 };
const MARGIN = 12;

/**
 * A página não aproxima: ela fica inteira, com os desenhos à vista. Só desliza
 * quando o balão está fora da tela (página maior que a tela no ajuste por
 * largura ou altura), para trazê-lo de volta.
 */
export function panFor(stop: GuidedStop, box: PageBox, vp: Viewport): Camera {
  const r = stop.rect;
  if (!r) return { scale: 1, x: 0, y: 0 };
  const cx = box.left + (r.x + r.w / 2) * box.width;
  const cy = box.top + (r.y + r.h / 2) * box.height;
  const contentW = box.left + box.width;
  const contentH = box.top + box.height;
  const x = contentW > vp.width ? clamp(vp.width / 2 - cx, vp.width - contentW, 0) : 0;
  const y = contentH > vp.height ? clamp(vp.height / 2 - cy, vp.height - contentH, 0) : 0;
  return { scale: 1, x, y };
}

/**
 * A lupa traz o balão para perto, por cima do próprio lugar, sem esconder a
 * cena em volta. No celular em pé ela ocupa boa parte da largura (o texto da
 * página inteira é pequeno demais); numa tela larga só amplia um pouco.
 */
export function lensFor(
  stop: GuidedStop,
  box: PageBox,
  cam: Camera,
  vp: Viewport,
  zoomLevel: GuidedZoom = 'medium',
): Lens | null {
  const r = stop.rect;
  if (!r) return null;
  // Folga em volta do balão: o contorno e o rabicho inteiros.
  const padX = Math.max(0.01, r.w * 0.12);
  const padY = Math.max(0.01, r.h * 0.22);
  const sx = Math.max(0, r.x - padX);
  const sy = Math.max(0, r.y - padY);
  const src = {
    x: sx,
    y: sy,
    w: Math.min(1, r.x + r.w + padX) - sx,
    h: Math.min(1, r.y + r.h + padY) - sy,
  };

  const page = {
    left: box.left + cam.x,
    top: box.top + cam.y,
    width: box.width,
    height: box.height,
  };
  const shownW = src.w * page.width;
  const shownH = src.h * page.height;

  const narrow = vp.width < 640;
  let zoom = narrow ? (NARROW_WIDTH[zoomLevel] * vp.width) / shownW : WIDE_ZOOM[zoomLevel];
  const sharp = (MAX_NATURAL * box.naturalWidth) / box.width;
  const fits = Math.min(
    (vp.width - MARGIN * 2) / shownW,
    ((narrow ? 0.7 : 0.6) * vp.height) / shownH,
  );
  zoom = Math.max(1.15, Math.min(zoom, sharp, fits));

  const width = shownW * zoom;
  const height = shownH * zoom;
  const cx = page.left + (src.x + src.w / 2) * page.width;
  const cy = page.top + (src.y + src.h / 2) * page.height;
  const left = clamp(cx - width / 2, MARGIN, vp.width - MARGIN - width);
  const top = clamp(cy - height / 2, MARGIN, vp.height - MARGIN - height);
  return { left, top, width, height, zoom, src, page };
}

function clamp(v: number, min: number, max: number): number {
  return max < min ? (min + max) / 2 : Math.min(max, Math.max(min, v));
}

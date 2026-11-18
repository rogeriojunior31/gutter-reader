/**
 * Detecção de balões de fala sem IA: um balão é uma região clara, fechada (não
 * encosta na borda da página), de tamanho razoável e com texto escuro dentro.
 *
 * Trabalha numa cópia reduzida da página (≤ MAX_SIDE px) em tons de cinza:
 * 1. rotula as regiões claras conectadas (4-vizinhança);
 * 2. descarta as que tocam a borda (fundo, calhas brancas) ou têm tamanho/forma
 *    improváveis;
 * 3. exige "furos" escuros por dentro (as letras) e pouca arte em meio-tom
 *    (para não confundir céu branco com balão).
 */

export interface BalloonRect {
  /** Posição e tamanho normalizados (0–1) em relação à página. */
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Lado máximo da cópia reduzida: texto ainda legível, rotulagem em poucos ms. */
export const MAX_SIDE = 900;

const LIGHT = 205;
const DARK = 120;

export function luminance(rgba: Uint8ClampedArray, w: number, h: number): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < out.length; i++, p += 4) {
    // Rec. 601 em inteiros.
    out[i] = ((rgba[p] ?? 0) * 77 + (rgba[p + 1] ?? 0) * 150 + (rgba[p + 2] ?? 0) * 29) >> 8;
  }
  return out;
}

interface Component {
  id: number;
  area: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  edge: boolean;
}

/** Encontra os balões de uma página em tons de cinza, em ordem de leitura. */
export function findBalloons(
  luma: Uint8Array,
  w: number,
  h: number,
  rtl = false,
  /** Diagnóstico: por que cada região clara grande foi descartada. */
  onReject?: (rect: BalloonRect, reason: string) => void,
  /** Células de texto da página: sem letras dentro, não é balão (céu, vela, parede clara). */
  cells?: TextCells,
): BalloonRect[] {
  const total = w * h;
  // Máscara clara "afinada" em 1 px (erosão em cruz): corta as pontes finas que
  // ligam um balão de contorno fraco a raios de luz, céu ou à calha branca.
  const mask = new Uint8Array(total);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      if (
        (luma[i] ?? 0) >= LIGHT &&
        (luma[i - 1] ?? 0) >= LIGHT &&
        (luma[i + 1] ?? 0) >= LIGHT &&
        (luma[i - w] ?? 0) >= LIGHT &&
        (luma[i + w] ?? 0) >= LIGHT
      )
        mask[i] = 1;
    }
  }
  const labels = new Int32Array(total);
  const stack = new Int32Array(total);
  const comps: Component[] = [];

  let next = 1;
  for (let start = 0; start < total; start++) {
    if (labels[start] !== 0 || mask[start] === 0) continue;
    const c: Component = {
      id: next,
      area: 0,
      minX: w,
      minY: h,
      maxX: 0,
      maxY: 0,
      edge: false,
    };
    labels[start] = next;
    let top = 0;
    stack[top++] = start;
    while (top > 0) {
      const i = stack[--top] as number;
      const x = i % w;
      const y = (i - x) / w;
      c.area++;
      if (x < c.minX) c.minX = x;
      if (x > c.maxX) c.maxX = x;
      if (y < c.minY) c.minY = y;
      if (y > c.maxY) c.maxY = y;
      // A erosão afasta tudo 1 px da borda; encostar na margem ainda é "borda".
      if (x <= 1 || y <= 1 || x >= w - 2 || y >= h - 2) c.edge = true;
      // Vizinhos claros ainda sem rótulo entram na pilha (sem closure: laço quente).
      let j = i - 1;
      if (x > 0 && labels[j] === 0 && mask[j] === 1) {
        labels[j] = next;
        stack[top++] = j;
      }
      j = i + 1;
      if (x < w - 1 && labels[j] === 0 && mask[j] === 1) {
        labels[j] = next;
        stack[top++] = j;
      }
      j = i - w;
      if (y > 0 && labels[j] === 0 && mask[j] === 1) {
        labels[j] = next;
        stack[top++] = j;
      }
      j = i + w;
      if (y < h - 1 && labels[j] === 0 && mask[j] === 1) {
        labels[j] = next;
        stack[top++] = j;
      }
    }
    comps.push(c);
    next++;
  }

  const minArea = total * 0.0006;
  const maxBox = total * 0.2;
  const minSide = Math.max(10, Math.min(w, h) * 0.035);
  const found: BalloonRect[] = [];

  for (const c of comps) {
    if (c.area < minArea) continue;
    const bw = c.maxX - c.minX + 1;
    const bh = c.maxY - c.minY + 1;
    const reject = (reason: string) =>
      onReject?.({ x: c.minX / w, y: c.minY / h, w: bw / w, h: bh / h }, reason);
    if (c.edge) {
      reject('borda');
      continue;
    }
    if (bw < minSide || bh < minSide || bw * bh > maxBox) {
      reject(`tamanho`);
      continue;
    }
    if (bw / bh > 6 || bh / bw > 6) {
      reject(`proporção`);
      continue;
    }

    // Dentro do contorno de cada linha: letras (escuras) e arte (meio-tom).
    let dark = 0;
    let mid = 0;
    let inside = 0;
    /** Linhas que atravessam várias letras: texto, e não um traço solto. */
    let textRows = 0;
    for (let y = c.minY; y <= c.maxY; y++) {
      const row = y * w;
      let left = -1;
      let right = -1;
      for (let x = c.minX; x <= c.maxX; x++) {
        if (labels[row + x] === c.id) {
          if (left < 0) left = x;
          right = x;
        }
      }
      if (left < 0) continue;
      let runs = 0;
      let inRun = false;
      for (let x = left; x <= right; x++) {
        inside++;
        const v = luma[row + x] ?? 0;
        const isDark = labels[row + x] !== c.id && v < DARK;
        if (isDark && !inRun) runs++;
        inRun = isDark;
        if (labels[row + x] === c.id) continue;
        if (isDark) dark++;
        else if (v < LIGHT) mid++;
      }
      if (runs >= 3) textRows++;
    }
    if (textRows < 2) {
      reject(`linhas de texto ${textRows}`);
      continue;
    }
    if (cells) {
      // Céu com capuz, vela de barco, parede clara: traços escuros, mas não letras.
      const { cs, gw, cell } = cells;
      let boxCells = 0;
      let textCount = 0;
      for (let gy = Math.floor(c.minY / cs); gy <= Math.floor(c.maxY / cs); gy++) {
        for (let gx = Math.floor(c.minX / cs); gx <= Math.floor(c.maxX / cs); gx++) {
          const cx = gx * cs + cs / 2;
          const cy = gy * cs + cs / 2;
          if (cx < c.minX || cx > c.maxX || cy < c.minY || cy > c.maxY) continue;
          boxCells++;
          if (cell[gy * gw + gx]) textCount++;
        }
      }
      if (textCount < 3 && textCount < boxCells * 0.02) {
        reject(`sem letras ${textCount}/${boxCells}`);
        continue;
      }
    }
    // Letras e a borda afinada contam como balão: o que importa é a silhueta.
    const fill = inside / (bw * bh);
    if (fill < 0.45) {
      reject(`preenchimento ${fill.toFixed(2)}`);
      continue;
    }
    if (dark / inside < 0.006 || dark / inside > 0.45) {
      reject(`escuro ${(dark / inside).toFixed(3)}`);
      continue;
    }
    // Letras têm borda serrilhada (meio-tom), mas arte de verdade tem muito mais.
    if (mid > dark * 4 + inside * 0.05) {
      reject(`meio-tom ${mid}/${dark}/${inside}`);
      continue;
    }

    // Devolve o pixel que a erosão tirou de cada lado.
    const x0 = Math.max(0, c.minX - 1);
    const y0 = Math.max(0, c.minY - 1);
    const x1 = Math.min(w, c.maxX + 2);
    const y1 = Math.min(h, c.maxY + 2);
    found.push({ x: x0 / w, y: y0 / h, w: (x1 - x0) / w, h: (y1 - y0) / h });
  }

  return readingOrder(found, rtl);
}

/** Linhas de cima para baixo; dentro da linha, esquerda→direita (ou o contrário no RTL). */
export function readingOrder(rects: BalloonRect[], rtl = false): BalloonRect[] {
  const sorted = [...rects].sort((a, b) => a.y + a.h / 2 - (b.y + b.h / 2));
  const rows: BalloonRect[][] = [];
  for (const r of sorted) {
    const cy = r.y + r.h / 2;
    const row = rows.at(-1);
    const ref = row?.[0];
    if (row && ref && Math.abs(cy - (ref.y + ref.h / 2)) < Math.min(ref.h, r.h) / 2) row.push(r);
    else rows.push([r]);
  }
  return rows.flatMap((row) => row.sort((a, b) => (rtl ? b.x - a.x : a.x - b.x)));
}

/**
 * Blocos de texto: letras escuras sobre fundo claro, agrupadas. Pega o que a
 * detecção de balão fechado perde (contorno colado na borda do quadro, balões
 * encadeados com a arte, legendas). A página vira uma grade de células; uma
 * célula é "texto" quando é majoritariamente clara e várias linhas dela cruzam
 * traços escuros; células de texto próximas viram um bloco.
 */
export interface TextCells {
  /** Lado da célula (px da cópia reduzida). */
  cs: number;
  gw: number;
  gh: number;
  /** 1 = célula com cara de letras (escuro sobre claro, várias linhas cruzando traços). */
  cell: Uint8Array;
}

export function textCells(luma: Uint8Array, w: number, h: number): TextCells {
  const cs = Math.max(8, Math.round(Math.min(w, h) / 55));
  const gw = Math.ceil(w / cs);
  const gh = Math.ceil(h / cs);
  const cell = new Uint8Array(gw * gh);

  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      const x0 = gx * cs;
      const y0 = gy * cs;
      const x1 = Math.min(w, x0 + cs);
      const y1 = Math.min(h, y0 + cs);
      let light = 0;
      let dark = 0;
      let textRows = 0;
      for (let y = y0; y < y1; y++) {
        let edges = 0;
        let prevLight = false;
        for (let x = x0; x < x1; x++) {
          const v = luma[y * w + x] ?? 0;
          if (v >= LIGHT) {
            light++;
            prevLight = true;
          } else if (v < DARK) {
            dark++;
            if (prevLight) edges++;
            prevLight = false;
          }
        }
        if (edges >= 2) textRows++;
      }
      const n = (x1 - x0) * (y1 - y0);
      if (light / n >= 0.36 && light / n <= 0.96 && dark / n >= 0.03 && textRows >= 2) {
        cell[gy * gw + gx] = 1;
      }
    }
  }
  return { cs, gw, gh, cell };
}

export function findTextBlocks(
  luma: Uint8Array,
  w: number,
  h: number,
  cells: TextCells = textCells(luma, w, h),
): BalloonRect[] {
  const { cs, gw, gh, cell } = cells;

  // Agrupa células de texto vizinhas (até uma célula de folga: espaço entre
  // palavras e entrelinha).
  const seen = new Uint8Array(gw * gh);
  const stack: number[] = [];
  const blocks: BalloonRect[] = [];
  for (let i = 0; i < cell.length; i++) {
    if (!cell[i] || seen[i]) continue;
    let count = 0;
    let minX = gw;
    let minY = gh;
    let maxX = 0;
    let maxY = 0;
    seen[i] = 1;
    stack.push(i);
    while (stack.length) {
      const j = stack.pop() as number;
      const cx = j % gw;
      const cy = (j - cx) / gw;
      count++;
      if (cx < minX) minX = cx;
      if (cx > maxX) maxX = cx;
      if (cy < minY) minY = cy;
      if (cy > maxY) maxY = cy;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue;
          const k = ny * gw + nx;
          if (cell[k] && !seen[k]) {
            seen[k] = 1;
            stack.push(k);
          }
        }
      }
    }
    // Uma linha de texto tem pelo menos umas 3 células; manchas soltas não.
    if (count < 3) continue;
    const bw = (maxX - minX + 1) * cs;
    const bh = (maxY - minY + 1) * cs;
    if (bw * bh > w * h * 0.12) continue; // hachura grande na arte, não texto
    // Bloco pequeno é uma ou duas palavras: mais largo que alto. Manchas pequenas
    // altas ou quadradas são hachura, mão, cabelo.
    if (count < 8 && bw < bh * 1.25) continue;
    // Densidade: texto preenche boa parte da caixa; traços soltos de arte não.
    if (count / ((maxX - minX + 1) * (maxY - minY + 1)) < 0.25) continue;
    const pad = cs * 0.75;
    const x = Math.max(0, minX * cs - pad);
    const y = Math.max(0, minY * cs - pad);
    blocks.push({
      x: x / w,
      y: y / h,
      w: (Math.min(w, (maxX + 1) * cs + pad) - x) / w,
      h: (Math.min(h, (maxY + 1) * cs + pad) - y) / h,
    });
  }
  return blocks;
}

/** Faixas normalizadas da margem da página (sem quadros): rodapé, número da página, créditos. */
export interface Margins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * Mede a margem andando da borda para dentro enquanto a linha (ou coluna) é
 * quase toda de uma cor só: papel claro ou fundo escuro, com no máximo um pouco
 * de texto. Para no primeiro quadro. Limitada a 12% de cada lado.
 */
export function pageMargins(luma: Uint8Array, w: number, h: number): Margins {
  const uniform = (count: number, at: (k: number) => number) => {
    let light = 0;
    let dark = 0;
    for (let k = 0; k < count; k++) {
      const v = at(k);
      if (v >= LIGHT) light++;
      else if (v < DARK) dark++;
    }
    return light / count >= 0.82 || dark / count >= 0.82;
  };
  const scan = (limit: number, isUniform: (i: number) => boolean) => {
    let i = 0;
    while (i < limit && isUniform(i)) i++;
    return i;
  };
  const maxH = Math.round(h * 0.12);
  const maxW = Math.round(w * 0.12);
  const top = scan(maxH, (y) => uniform(w, (x) => luma[y * w + x] ?? 0));
  const bottom = scan(maxH, (i) => uniform(w, (x) => luma[(h - 1 - i) * w + x] ?? 0));
  const left = scan(maxW, (x) => uniform(h, (y) => luma[y * w + x] ?? 0));
  const right = scan(maxW, (i) => uniform(h, (y) => luma[y * w + (w - 1 - i)] ?? 0));
  return { top: top / h, bottom: bottom / h, left: left / w, right: right / w };
}

function inMargin(r: BalloonRect, m: Margins): boolean {
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  return cy < m.top || cy > 1 - m.bottom || cx < m.left || cx > 1 - m.right;
}

/** Junta pedaços de uma mesma linha de texto (palavras separadas por espaço largo). */
export function mergeLines(blocks: readonly BalloonRect[], gap = 0.03): BalloonRect[] {
  const out = blocks.map((b) => ({ ...b }));
  let merged = true;
  while (merged) {
    merged = false;
    for (let i = 0; i < out.length && !merged; i++) {
      for (let j = i + 1; j < out.length && !merged; j++) {
        const a = out[i] as BalloonRect;
        const b = out[j] as BalloonRect;
        const vOverlap = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        const hGap = Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w);
        if (vOverlap > Math.min(a.h, b.h) * 0.5 && hGap < gap) {
          const x = Math.min(a.x, b.x);
          const y = Math.min(a.y, b.y);
          out[i] = {
            x,
            y,
            w: Math.max(a.x + a.w, b.x + b.w) - x,
            h: Math.max(a.y + a.h, b.y + b.h) - y,
          };
          out.splice(j, 1);
          merged = true;
        }
      }
    }
  }
  return out;
}

/** Cópia da grade sem as células que caem dentro dos balões já encontrados. */
function withoutBalloons(
  cells: TextCells,
  balloons: readonly BalloonRect[],
  w: number,
  h: number,
): TextCells {
  const cell = cells.cell.slice();
  const { cs, gw } = cells;
  for (const b of balloons) {
    const x0 = Math.floor((b.x * w) / cs);
    const x1 = Math.floor(((b.x + b.w) * w) / cs);
    const y0 = Math.floor((b.y * h) / cs);
    const y1 = Math.floor(((b.y + b.h) * h) / cs);
    for (let gy = y0; gy <= y1; gy++) for (let gx = x0; gx <= x1; gx++) cell[gy * gw + gx] = 0;
  }
  return { ...cells, cell };
}

function overlap(a: BalloonRect, b: BalloonRect): number {
  const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return x * y;
}

/**
 * Paradas da leitura guiada: balões fechados (contorno exato) mais os blocos de
 * texto que nenhum balão cobre, em ordem de leitura.
 */
export function readingStops(
  balloons: readonly BalloonRect[],
  blocks: readonly BalloonRect[],
  rtl = false,
  margins?: Margins,
): BalloonRect[] {
  const extra = mergeLines(blocks).filter(
    (b) =>
      !(margins && inMargin(b, margins)) && !balloons.some((c) => overlap(b, c) > b.w * b.h * 0.35),
  );
  return readingOrder([...balloons, ...extra], rtl);
}

/** Página em tons de cinza, reduzida, com os balões já encontrados. */
export interface PageAnalysis {
  luma: Uint8Array;
  w: number;
  h: number;
  balloons: BalloonRect[];
  /** Balões + blocos de texto soltos, em ordem de leitura (leitura guiada). */
  stops: BalloonRect[];
  /** Brilho médio da página (0–255). */
  brightness: number;
}

/** Analisa uma `<img>` já carregada (alguns ms, só na primeira vez de cada página). */
export function analyzeImage(
  img: HTMLImageElement,
  rtl = false,
  onReject?: (rect: BalloonRect, reason: string) => void,
): PageAnalysis | null {
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  if (!nw || !nh) return null;
  const scale = Math.min(1, MAX_SIDE / Math.max(nw, nh));
  const w = Math.max(1, Math.round(nw * scale));
  const h = Math.max(1, Math.round(nh * scale));
  const canvas =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(w, h)
      : Object.assign(document.createElement('canvas'), { width: w, height: h });
  const ctx = canvas.getContext('2d', { willReadFrequently: true }) as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, w, h);
  try {
    const luma = luminance(ctx.getImageData(0, 0, w, h).data, w, h);
    const cells = textCells(luma, w, h);
    const balloons = findBalloons(luma, w, h, rtl, onReject, cells);
    // Texto já dentro de um balão fechado não forma bloco de novo (sem parada dupla).
    const loose = withoutBalloons(cells, balloons, w, h);
    const stops = readingStops(
      balloons,
      findTextBlocks(luma, w, h, loose),
      rtl,
      pageMargins(luma, w, h),
    );
    let sum = 0;
    for (let i = 0; i < luma.length; i += 7) sum += luma[i] ?? 0;
    return { luma, w, h, balloons, stops, brightness: sum / Math.ceil(luma.length / 7) };
  } catch {
    // Imagem de outra origem (canvas "contaminado"): sem detecção.
    return null;
  }
}

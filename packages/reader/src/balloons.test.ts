import { describe, expect, it } from 'vitest';
import { findBalloons, findTextBlocks, readingOrder, readingStops } from './balloons.ts';
import { lensFor, panFor } from './guided.ts';

const W = 300;
const H = 400;

function page(bg = 140) {
  return new Uint8Array(W * H).fill(bg);
}

function ellipse(l: Uint8Array, cx: number, cy: number, rx: number, ry: number, v = 255) {
  for (let y = cy - ry; y <= cy + ry; y++) {
    for (let x = cx - rx; x <= cx + rx; x++) {
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) l[y * W + x] = v;
    }
  }
}

function rect(l: Uint8Array, x0: number, y0: number, w: number, h: number, v: number) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) l[y * W + x] = v;
}

/** "Texto": tracinhos escuros em linhas, como letras vistas de longe. */
function text(l: Uint8Array, x0: number, y0: number, w: number, lines: number) {
  for (let r = 0; r < lines; r++) {
    for (let x = x0; x < x0 + w; x += 4) rect(l, x, y0 + r * 7, 2, 4, 20);
  }
}

describe('findBalloons', () => {
  it('acha um balão claro com texto dentro', () => {
    const l = page();
    ellipse(l, 100, 80, 50, 30);
    text(l, 72, 68, 56, 3);
    const found = findBalloons(l, W, H);
    expect(found).toHaveLength(1);
    const b = found[0];
    expect(b?.x).toBeCloseTo(50 / W, 1);
    expect(b?.w).toBeCloseTo(101 / W, 1);
  });

  it('ignora área clara sem texto, calha na borda e céu com arte', () => {
    const l = page();
    ellipse(l, 100, 80, 50, 30); // vazio
    rect(l, 0, 200, W, 12, 255); // calha encostando na borda
    text(l, 20, 202, 200, 1);
    ellipse(l, 200, 300, 60, 40); // céu com prédio em meio-tom
    rect(l, 170, 290, 50, 40, 160);
    text(l, 175, 270, 20, 1);
    expect(findBalloons(l, W, H)).toEqual([]);
  });

  it('não confunde número branco grande (sem letras dentro) com balão', () => {
    const l = page();
    rect(l, 120, 150, 50, 90, 255);
    expect(findBalloons(l, W, H)).toEqual([]);
  });

  it('ordena em ordem de leitura, invertendo no RTL', () => {
    const l = page();
    ellipse(l, 220, 60, 45, 25);
    text(l, 195, 50, 50, 3);
    ellipse(l, 70, 62, 45, 25);
    text(l, 45, 52, 50, 3);
    ellipse(l, 150, 250, 45, 25);
    text(l, 125, 240, 50, 3);
    const ltr = findBalloons(l, W, H);
    expect(ltr.map((b) => Math.round(b.x * W))).toEqual([25, 175, 105]);
    const rtl = findBalloons(l, W, H, true);
    expect(rtl.map((b) => Math.round(b.x * W))).toEqual([175, 25, 105]);
  });
});

describe('readingOrder', () => {
  it('agrupa por linha e ordena dentro dela (invertendo no RTL)', () => {
    const a = { x: 0.6, y: 0.1, w: 0.2, h: 0.1 };
    const b = { x: 0.1, y: 0.12, w: 0.2, h: 0.1 };
    const c = { x: 0.3, y: 0.6, w: 0.2, h: 0.1 };
    expect(readingOrder([c, a, b])).toEqual([b, a, c]);
    expect(readingOrder([c, a, b], true)).toEqual([a, b, c]);
  });
});

describe('findTextBlocks e readingStops', () => {
  it('acha texto que a detecção de balão fechado perde (balão colado na borda)', () => {
    const l = page();
    rect(l, 0, 40, 160, 80, 255);
    text(l, 30, 60, 90, 5);
    expect(findBalloons(l, W, H)).toEqual([]);
    const blocks = findTextBlocks(l, W, H);
    expect(blocks).toHaveLength(1);
    const b = blocks[0];
    expect((b?.x ?? 1) * W).toBeLessThanOrEqual(30);
    expect(((b?.x ?? 0) + (b?.w ?? 0)) * W).toBeGreaterThanOrEqual(118);
  });

  it('ignora área clara vazia e arte em meio-tom', () => {
    const l = page();
    rect(l, 0, 200, 160, 80, 255);
    expect(findTextBlocks(l, W, H)).toEqual([]);
  });

  it('bloco dentro de um balão fechado não vira parada duplicada', () => {
    const l = page();
    ellipse(l, 100, 80, 50, 30);
    text(l, 72, 68, 56, 3);
    const balloons = findBalloons(l, W, H);
    const stops = readingStops(balloons, findTextBlocks(l, W, H));
    expect(stops).toEqual(balloons);
  });
});

describe('panFor e lensFor', () => {
  const box = { left: 0, top: 90, width: 390, height: 585, naturalWidth: 1000 };
  const stop = { page: 0, rect: { x: 0.1, y: 0.1, w: 0.2, h: 0.08 } };

  it('a página fica parada quando cabe na tela (os desenhos continuam à vista)', () => {
    expect(panFor(stop, box, { width: 390, height: 768 })).toEqual({ scale: 1, x: 0, y: 0 });
  });

  it('a página só desliza quando o balão está fora da tela', () => {
    const tall = { ...box, top: 0, height: 2000 };
    const low = { page: 0, rect: { x: 0.4, y: 0.9, w: 0.2, h: 0.05 } };
    const cam = panFor(low, tall, { width: 390, height: 700 });
    expect(cam.scale).toBe(1);
    expect(cam.y).toBeLessThan(0);
    expect(cam.y).toBeGreaterThanOrEqual(700 - 2000);
  });

  it('no celular, a lupa traz o balão para ~74% da largura, por cima do próprio lugar', () => {
    const vp = { width: 390, height: 768 };
    const lens = lensFor(stop, box, panFor(stop, box, vp), vp);
    expect(lens?.width).toBeCloseTo(0.74 * 390, 0);
    expect(lens?.left).toBeGreaterThanOrEqual(12);
    expect((lens?.left ?? 0) + (lens?.width ?? 0)).toBeLessThanOrEqual(390 - 12);
  });

  it('numa tela larga amplia pouco; leve < média < forte; sem balão, sem lupa', () => {
    const wide = { left: 400, top: 0, width: 584, height: 900, naturalWidth: 984 };
    const vp = { width: 1440, height: 824 };
    const cam = panFor(stop, wide, vp);
    const z = (level: 'soft' | 'medium' | 'strong') =>
      lensFor(stop, wide, cam, vp, level)?.zoom ?? 0;
    expect(z('soft')).toBeLessThan(z('medium'));
    expect(z('medium')).toBeLessThan(z('strong'));
    expect(z('strong')).toBeLessThanOrEqual(2.2);
    expect(lensFor({ page: 0, rect: null }, wide, cam, vp)).toBeNull();
  });
});

import { useQuery } from '@tanstack/react-query';
import { useSource } from '../sources/source-context.tsx';

/**
 * Cor da lombada a partir da capa: média de uma versão 8×8 da miniatura, levada
 * para uma luminosidade fixa e escura, para o número branco sempre ter contraste
 * e a estante ficar coesa mesmo com capas muito diferentes.
 */
export function useCoverColor(bookId: string | undefined): string | undefined {
  const source = useSource();
  const { data } = useQuery({
    queryKey: [source.kind, 'book', bookId, 'cover-color'],
    queryFn: async ({ signal }) =>
      averageColor(await source.getThumbnail(bookId ?? '', { signal })),
    enabled: !!bookId,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 30 * 60_000,
  });
  return data;
}

async function averageColor(blob: Blob): Promise<string> {
  const bitmap = await createImageBitmap(blob, { resizeWidth: 8, resizeHeight: 8 });
  try {
    const canvas = new OffscreenCanvas(8, 8);
    const ctx = canvas.getContext('2d');
    if (!ctx) return FALLBACK;
    ctx.drawImage(bitmap, 0, 0);
    const { data } = ctx.getImageData(0, 0, 8, 8);
    let r = 0;
    let g = 0;
    let b = 0;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i] ?? 0;
      g += data[i + 1] ?? 0;
      b += data[i + 2] ?? 0;
    }
    const n = data.length / 4;
    return spineTone(r / n, g / n, b / n);
  } finally {
    bitmap.close();
  }
}

const FALLBACK = 'oklch(0.34 0.05 275)';

/** Mantém o matiz da capa, fixa luminosidade escura e limita a saturação. */
function spineTone(r: number, g: number, b: number): string {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
  }
  const hue = Math.round(hslToOklchHue((h * 60 + 360) % 360));
  const chroma = Math.min(0.14, (d / 255) * 0.22);
  return `oklch(0.36 ${chroma.toFixed(3)} ${hue})`;
}

/** Os dois círculos de matiz não coincidem (vermelho: 0° em HSL, ~29° em OKLCH). */
const HUE_STOPS: [number, number][] = [
  [0, 29],
  [60, 110],
  [120, 142],
  [180, 195],
  [240, 264],
  [300, 328],
  [360, 389],
];
function hslToOklchHue(h: number): number {
  for (let i = 1; i < HUE_STOPS.length; i++) {
    const [h1, o1] = HUE_STOPS[i] as [number, number];
    const [h0, o0] = HUE_STOPS[i - 1] as [number, number];
    if (h <= h1) return (o0 + ((h - h0) / (h1 - h0)) * (o1 - o0)) % 360;
  }
  return 29;
}

import type {
  Book,
  Contributor,
  PageInfo,
  RequestOptions,
  Series,
  SeriesMetadata,
  Source,
} from '@gutter/core';
import { fnv1a64 } from '@gutter/core';

/**
 * Source de demonstração: gera páginas com canvas, sem nenhum arquivo.
 * Serve para desenvolver o Reader e a biblioteca antes do LocalSource existir.
 * Cobre: 120 páginas (ordenação), mangá RTL com spreads, webtoon e volumes variados.
 */

interface MockBookDef {
  pages: number;
  /** Índices de páginas largas (spreads duplos). */
  spreads?: number[];
  size?: [number, number];
}

interface MockSeriesDef {
  name: string;
  hue: number;
  rtl?: boolean;
  webtoon?: boolean;
  books: MockBookDef[];
  meta?: SeriesMetadata;
}

const w = (name: string): Contributor => ({ name, role: 'writer' });
const a = (name: string): Contributor => ({ name, role: 'artist' });

const SERIES: MockSeriesDef[] = [
  {
    name: 'Páginas Numeradas',
    hue: 210,
    books: [{ pages: 120 }],
    meta: {
      summary:
        'Volume de teste com 120 páginas numeradas, para conferir ordenação natural, scrubber e preload.',
      year: 2026,
      provider: 'manual',
    },
  },
  {
    name: 'Ronin da Maré',
    hue: 350,
    rtl: true,
    books: [
      { pages: 42, spreads: [9, 24] },
      { pages: 38, spreads: [15] },
      { pages: 40, spreads: [5, 6, 30] },
    ],
    meta: {
      summary:
        'Depois que a frota do seu clã afunda numa tempestade impossível, Kaito passa a seguir as marés atrás de quem a invocou. Cada porto esconde uma dívida antiga e cada lâmina, um juramento quebrado.',
      contributors: [w('Haruto Mizuno'), a('Haruto Mizuno')],
      genres: ['Ação', 'Aventura', 'Histórico'],
      tags: ['Samurai', 'Mar', 'Vingança'],
      year: 2019,
      publisher: 'Kurogane',
      status: 'ongoing',
      ageRating: '16+',
      provider: 'anilist',
      externalIds: { anilist: '000000' },
    },
  },
  {
    name: 'Torre Infinita',
    hue: 160,
    webtoon: true,
    books: Array.from({ length: 4 }, () => ({ pages: 24, size: [800, 2400] as [number, number] })),
    meta: {
      summary:
        'Uma torre surge no meio de Seul e oferece qualquer desejo a quem chegar ao topo. Min-ji entra para salvar o irmão e descobre que cada andar reescreve as regras do anterior.',
      contributors: [w('Seo Yun'), a('Park Dae-ho')],
      genres: ['Fantasia', 'Ação', 'Mistério'],
      tags: ['Webtoon', 'Torre', 'Sistema'],
      year: 2022,
      publisher: 'Line Studio',
      status: 'ongoing',
      ageRating: '14+',
      provider: 'anilist',
    },
  },
  {
    name: 'Capitã Aurora',
    hue: 40,
    books: Array.from({ length: 6 }, (_, i) => ({ pages: 22 + i * 2, spreads: [11] })),
    meta: {
      summary:
        'A primeira super-heroína do Brasil volta da aposentadoria quando uma cópia sua começa a salvar o país de um jeito que ninguém pediu.',
      contributors: [w('Marina Duarte'), a('Lucas Okada'), { name: 'Bia Reis', role: 'colorist' }],
      genres: ['Super-herói', 'Ação', 'Comédia'],
      year: 2023,
      publisher: 'Editora Farol',
      status: 'completed',
      ageRating: '12+',
      provider: 'comicvine',
    },
  },
  {
    name: 'Contos do Sertão',
    hue: 25,
    books: [{ pages: 64 }, { pages: 58 }],
    meta: {
      summary:
        'Antologia de histórias curtas sobre cangaço, assombrações e a seca, em preto e branco com xilogravura digital.',
      contributors: [w('José Arimatéia'), a('Lia Bezerra')],
      genres: ['Antologia', 'Terror', 'Drama'],
      tags: ['Nordeste', 'Folclore'],
      year: 2018,
      publisher: 'Mandacaru',
      status: 'completed',
      provider: 'comicinfo',
    },
  },
  {
    name: 'Nebulosa 9',
    hue: 270,
    books: [{ pages: 30 }, { pages: 30 }, { pages: 28 }],
    meta: {
      summary:
        'Nove desconhecidos acordam numa nave sem tripulação, a anos-luz de casa. O computador de bordo jura que um deles não é humano.',
      contributors: [w('R. Caldeira'), a('Yuki Tanabe')],
      genres: ['Ficção científica', 'Suspense'],
      year: 2024,
      publisher: 'Órbita',
      status: 'ongoing',
      provider: 'comicvine',
    },
  },
  {
    name: 'Cidade de Vidro',
    hue: 190,
    rtl: true,
    books: [{ pages: 50, spreads: [2] }],
    meta: {
      summary:
        'Numa cidade onde as paredes são transparentes por lei, uma garota descobre como ficar invisível.',
      contributors: [w('Aoi Fujita'), a('Aoi Fujita')],
      genres: ['Slice of life', 'Mistério'],
      year: 2021,
      status: 'completed',
      ageRating: 'Livre',
      provider: 'anilist',
    },
  },
  {
    name: 'O Último Farol',
    hue: 0,
    books: [{ pages: 36 }],
    meta: {
      summary: 'Um faroleiro e uma baleia tentam impedir que a última luz do litoral se apague.',
      contributors: [w('Clara Neves'), a('Tomás Lage')],
      genres: ['Drama', 'Fantasia'],
      year: 2020,
      publisher: 'Editora Farol',
      status: 'completed',
      ageRating: 'Livre',
      provider: 'comicinfo',
    },
  },
  {
    name: 'Ruído Branco',
    hue: 300,
    books: Array.from({ length: 8 }, () => ({ pages: 20 })),
    meta: {
      summary:
        'Uma rádio pirata dos anos 90 capta transmissões do futuro. O problema é que o futuro também está ouvindo.',
      contributors: [w('Davi Moura'), a('Nina Sato')],
      genres: ['Ficção científica', 'Terror'],
      tags: ['Anos 90', 'Rádio'],
      year: 2017,
      publisher: 'Órbita',
      status: 'hiatus',
      ageRating: '16+',
      provider: 'comicvine',
    },
  },
  {
    name: 'Mar de Ferrugem',
    hue: 15,
    rtl: true,
    books: [{ pages: 44 }, { pages: 46 }],
    meta: {
      summary:
        'Catadores de sucata atravessam um oceano seco cheio de navios mortos procurando o motor que pode trazer a chuva de volta.',
      contributors: [w('Kenji Ota'), a('Kenji Ota')],
      genres: ['Aventura', 'Pós-apocalíptico'],
      year: 2016,
      publisher: 'Kurogane',
      status: 'cancelled',
      ageRating: '14+',
      provider: 'anilist',
    },
  },
];

const PORTRAIT: [number, number] = [1000, 1500];
const DAY = 86_400_000;
const BASE_TIME = Date.UTC(2026, 9, 1);

interface Built {
  series: Series[];
  books: Map<string, Book>;
  booksBySeries: Map<string, Book[]>;
  pages: Map<string, PageInfo[]>;
  meta: Map<string, { hue: number; seriesName: string; webtoon: boolean }>;
}

function build(): Built {
  const out: Built = {
    series: [],
    books: new Map(),
    booksBySeries: new Map(),
    pages: new Map(),
    meta: new Map(),
  };

  SERIES.forEach((def, si) => {
    const seriesId = `mock-${fnv1a64(def.name).slice(0, 8)}`;
    const books: Book[] = def.books.map((b, bi) => {
      const id = `${seriesId}-${bi + 1}`;
      const [w, h] = b.size ?? PORTRAIT;
      const spreads = new Set(b.spreads ?? []);
      const pages: PageInfo[] = Array.from({ length: b.pages }, (_, index) => ({
        index,
        name: `${index + 1}.webp`,
        width: spreads.has(index) ? w * 2 : w,
        height: h,
        mediaType: 'image/webp',
      }));
      out.pages.set(id, pages);
      out.meta.set(id, { hue: def.hue, seriesName: def.name, webtoon: !!def.webtoon });
      const label = def.webtoon ? 'Capítulo' : 'Vol.';
      const book: Book = {
        id,
        hash: fnv1a64(id),
        seriesId,
        title: def.books.length > 1 ? `${label} ${bi + 1}` : def.name,
        number: bi + 1,
        format: 'cbz',
        pageCount: b.pages,
        size: b.pages * 350_000,
        mtime: BASE_TIME + (si * 3 + bi) * DAY,
      };
      if (def.rtl) book.rtl = true;
      out.books.set(id, book);
      return book;
    });
    out.booksBySeries.set(seriesId, books);
    const series: Series = {
      id: seriesId,
      name: def.name,
      bookCount: books.length,
      addedAt: BASE_TIME + si * 3 * DAY,
    };
    if (def.rtl) series.rtl = true;
    if (def.meta) series.metadata = def.meta;
    if (books[0]) series.coverBookId = books[0].id;
    out.series.push(series);
  });

  return out;
}

export class MockSource implements Source {
  readonly kind = 'mock' as const;
  readonly #data = build();
  readonly #latency: [number, number];

  constructor(opts: { latency?: [number, number] } = {}) {
    this.#latency = opts.latency ?? [40, 160];
  }

  async listSeries(opts?: RequestOptions) {
    await this.#delay(opts?.signal);
    return this.#data.series;
  }

  async getSeries(seriesId: string, opts?: RequestOptions) {
    await this.#delay(opts?.signal);
    return must(
      this.#data.series.find((s) => s.id === seriesId),
      `série ${seriesId}`,
    );
  }

  async listBooks(seriesId: string, opts?: RequestOptions) {
    await this.#delay(opts?.signal);
    return this.#data.booksBySeries.get(seriesId) ?? [];
  }

  async getBook(bookId: string, opts?: RequestOptions) {
    await this.#delay(opts?.signal);
    return must(this.#data.books.get(bookId), `livro ${bookId}`);
  }

  async listPages(bookId: string, opts?: RequestOptions) {
    await this.#delay(opts?.signal);
    return must(this.#data.pages.get(bookId), `livro ${bookId}`);
  }

  async getPage(bookId: string, index: number, opts?: RequestOptions) {
    await this.#delay(opts?.signal);
    const page = must(this.#data.pages.get(bookId)?.[index], `página ${index}`);
    const book = must(this.#data.books.get(bookId), `livro ${bookId}`);
    const meta = must(this.#data.meta.get(bookId), `livro ${bookId}`);
    return renderPage(page, book, meta);
  }

  async getThumbnail(bookId: string, opts?: RequestOptions) {
    await this.#delay(opts?.signal);
    const book = must(this.#data.books.get(bookId), `livro ${bookId}`);
    const meta = must(this.#data.meta.get(bookId), `livro ${bookId}`);
    return renderCover(book, meta);
  }

  #delay(signal?: AbortSignal): Promise<void> {
    const [min, max] = this.#latency;
    const ms = min + Math.random() * (max - min);
    return new Promise((resolve, reject) => {
      if (signal?.aborted) return reject(signal.reason);
      const t = setTimeout(resolve, ms);
      signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(t);
          reject(signal.reason);
        },
        { once: true },
      );
    });
  }
}

function must<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`${what} não encontrado`);
  return value;
}

// ---------------------------------------------------------------------------
// Renderização das páginas falsas

type Meta = { hue: number; seriesName: string; webtoon: boolean };

function canvas(w: number, h: number) {
  const c = new OffscreenCanvas(w, h);
  const ctx = c.getContext('2d');
  if (!ctx) throw new Error('canvas 2d indisponível');
  return { c, ctx };
}

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

async function renderPage(page: PageInfo, book: Book, meta: Meta): Promise<Blob> {
  const w = page.width ?? PORTRAIT[0];
  const h = page.height ?? PORTRAIT[1];
  const { c, ctx } = canvas(w, h);
  const rand = rng(Number.parseInt(book.hash.slice(0, 8), 16) + page.index * 7919);
  const hue = meta.hue;

  ctx.fillStyle = `hsl(${hue} 15% 92%)`;
  ctx.fillRect(0, 0, w, h);

  const pad = Math.round(w * 0.04);
  const gutter = Math.round(w * 0.02);
  if (meta.webtoon) {
    drawWebtoonSlice(ctx, w, h, hue, rand);
  } else {
    // Grade de quadros aleatória: 2 a 4 linhas, 1 a 3 colunas por linha.
    const rows = 2 + Math.floor(rand() * 3);
    const rowH = (h - pad * 2 - gutter * (rows - 1)) / rows;
    for (let r = 0; r < rows; r++) {
      const cols = 1 + Math.floor(rand() * (w > h ? 4 : 3));
      const colW = (w - pad * 2 - gutter * (cols - 1)) / cols;
      for (let col = 0; col < cols; col++) {
        const x = pad + col * (colW + gutter);
        const y = pad + r * (rowH + gutter);
        const light = 35 + rand() * 40;
        const grad = ctx.createLinearGradient(x, y, x + colW, y + rowH);
        grad.addColorStop(0, `hsl(${hue + rand() * 40 - 20} 45% ${light}%)`);
        grad.addColorStop(1, `hsl(${hue + 30} 35% ${light - 15}%)`);
        ctx.fillStyle = grad;
        ctx.fillRect(x, y, colW, rowH);
        ctx.lineWidth = Math.max(4, w * 0.005);
        ctx.strokeStyle = '#111';
        ctx.strokeRect(x, y, colW, rowH);
      }
    }
  }

  // Número da página bem visível, para conferir ordem e direção.
  const label = `${page.index + 1}`;
  const size = Math.round(Math.min(w, h) * 0.28);
  ctx.font = `900 ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = size * 0.08;
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.fillStyle = '#fff';
  ctx.strokeText(label, w / 2, h / 2);
  ctx.fillText(label, w / 2, h / 2);

  const caption = `${meta.seriesName} · ${book.title}${(page.width ?? 0) > (page.height ?? 0) ? ' · SPREAD' : ''}`;
  ctx.font = `600 ${Math.round(Math.min(w, h) * 0.03)}px system-ui, sans-serif`;
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = '#222';
  ctx.fillText(caption, w / 2, h - pad * 0.25);

  return c.convertToBlob({ type: 'image/webp', quality: 0.8 });
}

function drawWebtoonSlice(
  ctx: OffscreenCanvasRenderingContext2D,
  w: number,
  h: number,
  hue: number,
  rand: () => number,
) {
  const grad = ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, `hsl(${hue} 40% 20%)`);
  grad.addColorStop(1, `hsl(${hue + 40} 40% 30%)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  let y = h * 0.08;
  while (y < h * 0.9) {
    const ph = h * (0.15 + rand() * 0.15);
    const inset = w * (0.05 + rand() * 0.1);
    ctx.fillStyle = `hsl(${hue + rand() * 60} 50% ${40 + rand() * 30}%)`;
    ctx.fillRect(inset, y, w - inset * 2, ph);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 6;
    ctx.strokeRect(inset, y, w - inset * 2, ph);
    y += ph + h * (0.05 + rand() * 0.08);
  }
}

async function renderCover(book: Book, meta: Meta): Promise<Blob> {
  const w = 300;
  const h = 450;
  const { c, ctx } = canvas(w, h);
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, `hsl(${meta.hue} 60% 45%)`);
  grad.addColorStop(1, `hsl(${meta.hue + 40} 55% 18%)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.arc(w * 0.8, h * 0.25, 40 + i * 38, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#fff';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = '800 30px system-ui, sans-serif';
  wrap(ctx, meta.seriesName.toUpperCase(), 20, h - 150, w - 40, 34);
  ctx.font = '600 18px system-ui, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText(book.title === meta.seriesName ? 'Edição única' : book.title, 20, h - 40);
  return c.convertToBlob({ type: 'image/webp', quality: 0.85 });
}

function wrap(
  ctx: OffscreenCanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH: number,
) {
  let line = '';
  let yy = y;
  for (const word of text.split(' ')) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lineH;
    } else line = test;
  }
  ctx.fillText(line, x, yy);
}

import type { Contributor, ContributorRole, SeriesMetadata } from './types.ts';

export interface ComicInfo {
  title?: string;
  series?: string;
  number?: number;
  volume?: number;
  summary?: string;
  year?: number;
  month?: number;
  day?: number;
  publisher?: string;
  genres?: string[];
  tags?: string[];
  ageRating?: string;
  contributors?: Contributor[];
  pageCount?: number;
  /** Manga=YesAndRightToLeft */
  rtl?: boolean;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, '&');
}

/** "Ação, Aventura ,  Drama" → ["Ação", "Aventura", "Drama"] (sem duplicatas). */
function splitList(v: string | undefined): string[] | undefined {
  if (!v) return undefined;
  const items = [...new Set(v.split(/[,;]/).map((s) => s.trim()))].filter(Boolean);
  return items.length ? items : undefined;
}

const ROLE_TAGS: [string, ContributorRole][] = [
  ['Writer', 'writer'],
  ['Penciller', 'penciller'],
  ['Colorist', 'colorist'],
  ['Translator', 'translator'],
];

/**
 * Parser mínimo do ComicInfo.xml (formato plano, sem namespaces relevantes).
 * Sem DOMParser para funcionar dentro de Web Workers.
 */
export function parseComicInfo(xml: string): ComicInfo {
  const tag = (name: string): string | undefined => {
    const m = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, 'i'));
    const v = m?.[1]?.trim();
    return v ? decodeEntities(v) : undefined;
  };
  const num = (name: string): number | undefined => {
    const v = tag(name);
    if (v === undefined) return undefined;
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : undefined;
  };

  const info: ComicInfo = {};
  const set = <K extends keyof ComicInfo>(k: K, v: ComicInfo[K] | undefined) => {
    if (v !== undefined) info[k] = v;
  };
  set('title', tag('Title'));
  set('series', tag('Series'));
  set('number', num('Number'));
  set('volume', num('Volume'));
  set('summary', tag('Summary'));
  set('year', num('Year'));
  set('month', num('Month'));
  set('day', num('Day'));
  set('publisher', tag('Publisher'));
  set('genres', splitList(tag('Genre')));
  set('tags', splitList(tag('Tags')));
  set('ageRating', tag('AgeRating'));
  set('pageCount', num('PageCount'));

  const contributors = ROLE_TAGS.flatMap(([t, role]) =>
    (splitList(tag(t)) ?? []).map((name) => ({ name, role })),
  );
  if (contributors.length) info.contributors = contributors;

  const manga = tag('Manga');
  if (manga) info.rtl = manga.toLowerCase() === 'yesandrighttoleft';
  return info;
}

/** Converte o ComicInfo do primeiro livro em metadados de série. */
export function comicInfoToSeriesMetadata(info: ComicInfo): SeriesMetadata {
  const meta: SeriesMetadata = { provider: 'comicinfo' };
  if (info.summary) meta.summary = info.summary;
  if (info.contributors) meta.contributors = info.contributors;
  if (info.genres) meta.genres = info.genres;
  if (info.tags) meta.tags = info.tags;
  if (info.year) meta.year = info.year;
  if (info.publisher) meta.publisher = info.publisher;
  if (info.ageRating) meta.ageRating = info.ageRating;
  return meta;
}

export const ROLE_LABEL: Record<ContributorRole, string> = {
  writer: 'Roteiro',
  artist: 'Arte',
  penciller: 'Desenho',
  colorist: 'Cores',
  translator: 'Tradução',
};

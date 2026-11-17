export type BookFormat = 'cbz' | 'cbr' | 'cb7' | 'pdf';

/** Uma página dentro de um livro. `index` é a posição após a ordenação natural. */
export interface PageInfo {
  index: number;
  name: string;
  width?: number;
  height?: number;
  mediaType: string;
}

export interface Book {
  /** Local: hash(caminho + tamanho + mtime). Remoto: ID do banco. */
  id: string;
  /** Sempre o hash local, para casar progresso local com remoto. */
  hash: string;
  seriesId: string;
  title: string;
  /** Número do volume/capítulo (ComicInfo `Number` ou extraído do nome). */
  number?: number;
  format: BookFormat;
  pageCount: number;
  size: number;
  mtime: number;
  /** Sobrescreve a direção da série (ex.: ComicInfo Manga=YesAndRightToLeft). */
  rtl?: boolean;
  summary?: string;
  /** ISO 8601 (só data). */
  releaseDate?: string;
}

export type SeriesStatus = 'ongoing' | 'completed' | 'hiatus' | 'cancelled';
export type ContributorRole = 'writer' | 'artist' | 'penciller' | 'colorist' | 'translator';
export type MetadataProvider = 'comicinfo' | 'anilist' | 'comicvine' | 'manual';

export interface Contributor {
  name: string;
  role: ContributorRole;
}

/**
 * Metadados da série. Vêm do ComicInfo.xml (fase 1), do servidor (fase 2) e de
 * provedores externos como AniList/ComicVine (backlog). Tudo opcional.
 */
export interface SeriesMetadata {
  summary?: string;
  contributors?: Contributor[];
  genres?: string[];
  tags?: string[];
  year?: number;
  publisher?: string;
  status?: SeriesStatus;
  ageRating?: string;
  /** De onde vieram os metadados, para o usuário saber o que confiar/editar. */
  provider?: MetadataProvider;
  externalIds?: Partial<Record<'anilist' | 'mal' | 'comicvine', string>>;
}

export interface Series {
  id: string;
  name: string;
  bookCount: number;
  rtl?: boolean;
  /** Livro usado como capa da série. */
  coverBookId?: string;
  addedAt: number;
  metadata?: SeriesMetadata;
}

/** Coleção criada pelo usuário, agrupando séries de qualquer biblioteca. */
export interface Collection {
  id: string;
  name: string;
  description?: string;
  /** Em ordem de exibição. */
  seriesIds: string[];
  /** Coleção fixada na tela inicial. */
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ReadProgress {
  bookId: string;
  page: number;
  completed: boolean;
  updatedAt: number;
}

export type ReaderLayout = 'single' | 'double' | 'webtoon';
export type ReadingDirection = 'ltr' | 'rtl';
export type FitMode = 'width' | 'height' | 'screen' | 'original';

export interface ReaderSettings {
  layout: ReaderLayout;
  direction: ReadingDirection;
  fit: FitMode;
  /** Na página dupla, desloca uma página para a capa ficar sozinha. */
  coverAlone: boolean;
}

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  layout: 'single',
  direction: 'ltr',
  fit: 'screen',
  coverAlone: true,
};

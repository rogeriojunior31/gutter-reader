import type { BookFormat } from './types.ts';

const JUNK_NAMES = new Set(['thumbs.db', '.ds_store', 'desktop.ini']);
const IMAGE_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  avif: 'image/avif',
  jxl: 'image/jxl',
  bmp: 'image/bmp',
};
const BOOK_FORMATS: Record<string, BookFormat> = {
  cbz: 'cbz',
  zip: 'cbz',
  cbr: 'cbr',
  rar: 'cbr',
  cb7: 'cb7',
  '7z': 'cb7',
  pdf: 'pdf',
};

export function extension(path: string): string {
  const base = basename(path);
  const dot = base.lastIndexOf('.');
  return dot <= 0 ? '' : base.slice(dot + 1).toLowerCase();
}

export function basename(path: string): string {
  const parts = path.split(/[\\/]/);
  return parts[parts.length - 1] ?? path;
}

/** Arquivos ocultos, metadados do macOS/Windows e afins. */
export function isJunkPath(path: string): boolean {
  const segments = path.split(/[\\/]/).filter(Boolean);
  return segments.some(
    (s) => s === '__MACOSX' || s.startsWith('.') || JUNK_NAMES.has(s.toLowerCase()),
  );
}

export function imageMediaType(path: string): string | undefined {
  return IMAGE_TYPES[extension(path)];
}

export function bookFormat(path: string): BookFormat | undefined {
  return BOOK_FORMATS[extension(path)];
}

import {
  type ComicInfo,
  imageMediaType,
  isJunkPath,
  naturalCompare,
  type PageInfo,
  parseComicInfo,
} from '@gutter/core';

/** Entrada de um arquivo compactado, independente do formato. */
export interface ArchiveEntry {
  name: string;
  directory: boolean;
}

/**
 * Do conteúdo bruto do arquivo para a lista de páginas: só imagens, sem lixo de SO,
 * em ordem natural pelo caminho completo. Devolve também onde está o ComicInfo.xml.
 */
export function listPages<E extends ArchiveEntry>(
  entries: readonly E[],
): { pages: PageInfo[]; pageEntries: E[]; comicInfoEntry?: E } {
  const images = entries
    .filter((e) => !e.directory && !isJunkPath(e.name) && imageMediaType(e.name))
    .sort((a, b) => naturalCompare(a.name, b.name));

  const comicInfoEntry = entries.find(
    (e) => !e.directory && /(^|\/)comicinfo\.xml$/i.test(e.name.replaceAll('\\', '/')),
  );

  const pages = images.map((e, index) => ({
    index,
    name: e.name,
    mediaType: imageMediaType(e.name) ?? 'application/octet-stream',
  }));
  return comicInfoEntry
    ? { pages, pageEntries: images, comicInfoEntry }
    : { pages, pageEntries: images };
}

export async function readComicInfo(blob: Blob | undefined): Promise<ComicInfo | undefined> {
  if (!blob) return undefined;
  try {
    return parseComicInfo(await blob.text());
  } catch {
    return undefined; // ComicInfo quebrado não impede a leitura
  }
}

export function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
}

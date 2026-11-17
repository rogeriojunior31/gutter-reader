import { imageMediaType } from '@gutter/core';
import { BlobReader, BlobWriter, configure, type FileEntry, ZipReader } from '@zip.js/zip.js';
import type { Decoder, OpenResult } from '../protocol.ts';
import { listPages, readComicInfo, throwIfAborted } from './listing.ts';

// Já estamos num worker: o zip.js não precisa abrir outros.
configure({ useWebWorkers: false });

/**
 * CBZ/ZIP: lê só o diretório central ao abrir e extrai a página pedida sob demanda.
 * O Blob do arquivo fica no disco; o zip.js lê fatias dele (sem carregar tudo).
 */
export class ZipDecoder implements Decoder {
  #reader?: ZipReader<Blob>;
  #pages: FileEntry[] = [];

  async open(file: Blob): Promise<OpenResult> {
    this.#reader = new ZipReader(new BlobReader(file));
    const entries = (await this.#reader.getEntries()).filter((e): e is FileEntry => !e.directory);
    const listed = listPages(
      entries.map((e) => ({ name: e.filename, directory: e.directory, entry: e })),
    );
    this.#pages = listed.pageEntries.map((e) => e.entry);

    const comicInfo = await readComicInfo(
      listed.comicInfoEntry
        ? await listed.comicInfoEntry.entry.getData(new BlobWriter())
        : undefined,
    );
    return comicInfo ? { pages: listed.pages, comicInfo } : { pages: listed.pages };
  }

  async page(index: number, signal: AbortSignal): Promise<Blob> {
    const entry = this.#pages[index];
    if (!entry) throw new Error(`página ${index + 1} não existe neste arquivo`);
    throwIfAborted(signal);
    return entry.getData(new BlobWriter(imageMediaType(entry.filename)), { signal });
  }

  async close(): Promise<void> {
    await this.#reader?.close();
    this.#reader = undefined;
    this.#pages = [];
  }
}

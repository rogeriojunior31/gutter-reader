import { imageMediaType } from '@gutter/core';
import { createExtractorFromData, type Extractor } from 'node-unrar-js';
import wasmUrl from 'node-unrar-js/esm/js/unrar.wasm?url';
import type { Decoder, OpenResult } from '../protocol.ts';
import { listPages, readComicInfo, throwIfAborted } from './listing.ts';

let wasmBinary: Promise<ArrayBuffer> | undefined;
function loadWasm(): Promise<ArrayBuffer> {
  wasmBinary ??= fetch(wasmUrl).then((r) => {
    if (!r.ok) throw new Error(`não deu para carregar o descompactador RAR (${r.status})`);
    return r.arrayBuffer();
  });
  return wasmBinary;
}

/**
 * CBR/RAR via unrar oficial (WASM). O unrar precisa do arquivo inteiro na memória.
 * RAR "sólido" só descompacta em sequência: extrair a página 30 sozinha custaria
 * descompactar as 29 anteriores de novo. Nesse caso extraímos tudo ao abrir;
 * nos não sólidos, página a página.
 */
export class RarDecoder implements Decoder {
  #extractor?: Extractor<Uint8Array>;
  #names: string[] = [];
  /** Preenchido de uma vez em arquivos sólidos. */
  #all?: Map<string, Uint8Array<ArrayBuffer>>;

  async open(file: Blob): Promise<OpenResult> {
    const [data, wasm] = await Promise.all([file.arrayBuffer(), loadWasm()]);
    this.#extractor = await createExtractorFromData({ data, wasmBinary: wasm });

    const list = this.#extractor.getFileList();
    const headers = [...list.fileHeaders];
    const solid = list.arcHeader.flags.solid || headers.some((h) => h.flags.solid);
    const listed = listPages(headers.map((h) => ({ name: h.name, directory: h.flags.directory })));
    this.#names = listed.pageEntries.map((e) => e.name);

    if (solid) {
      this.#all = new Map();
      const wanted = new Set([...this.#names, listed.comicInfoEntry?.name].filter(Boolean));
      for (const f of this.#extractor.extract({ files: (h) => wanted.has(h.name) }).files) {
        // Cópia própria: a extração pode ser uma vista da memória do WASM.
        if (f.extraction) this.#all.set(f.fileHeader.name, f.extraction.slice());
      }
    }

    const infoName = listed.comicInfoEntry?.name;
    const infoBytes = infoName ? this.#bytes(infoName) : undefined;
    const comicInfo = await readComicInfo(infoBytes ? new Blob([infoBytes]) : undefined);
    return comicInfo ? { pages: listed.pages, comicInfo } : { pages: listed.pages };
  }

  async page(index: number, signal: AbortSignal): Promise<Blob> {
    const name = this.#names[index];
    if (!name) throw new Error(`página ${index + 1} não existe neste arquivo`);
    throwIfAborted(signal);
    const bytes = this.#bytes(name);
    if (!bytes) throw new Error(`não deu para extrair ${name}`);
    return new Blob([bytes], { type: imageMediaType(name) });
  }

  async close(): Promise<void> {
    this.#extractor = undefined;
    this.#all = undefined;
    this.#names = [];
  }

  #bytes(name: string): Uint8Array<ArrayBuffer> | undefined {
    if (this.#all) return this.#all.get(name);
    const files = this.#extractor?.extract({ files: [name] }).files;
    if (!files) return undefined;
    for (const f of files) if (f.extraction) return f.extraction.slice();
    return undefined;
  }
}

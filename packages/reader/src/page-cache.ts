export type PageEntry =
  | { status: 'loading' }
  | { status: 'ready'; url: string }
  | { status: 'error'; error: Error };

export type PageLoader = (index: number, signal: AbortSignal) => Promise<Blob>;

export interface PageCacheOptions {
  createUrl?: (blob: Blob) => string;
  revokeUrl?: (url: string) => void;
}

type InternalEntry = PageEntry & { ctrl?: AbortController };

/**
 * Guarda ObjectURLs só das páginas dentro da janela atual.
 * Ao mover a janela: carrega o que falta, aborta o que estava carregando e
 * revoga as URLs que saíram. Sem React, para ser testável isoladamente.
 */
export class PageCache {
  #entries = new Map<number, InternalEntry>();
  #listeners = new Set<() => void>();
  #version = 0;
  readonly #createUrl: (blob: Blob) => string;
  readonly #revokeUrl: (url: string) => void;

  constructor(
    private readonly load: PageLoader,
    opts: PageCacheOptions = {},
  ) {
    this.#createUrl = opts.createUrl ?? ((b) => URL.createObjectURL(b));
    this.#revokeUrl = opts.revokeUrl ?? ((u) => URL.revokeObjectURL(u));
  }

  get version(): number {
    return this.#version;
  }

  get size(): number {
    return this.#entries.size;
  }

  get(index: number): PageEntry | undefined {
    return this.#entries.get(index);
  }

  /** Define o conjunto exato de páginas que devem existir em memória. */
  setWindow(indices: Iterable<number>): void {
    const wanted = new Set(indices);
    let changed = false;

    for (const [index, entry] of this.#entries) {
      if (wanted.has(index)) continue;
      this.#evict(entry);
      this.#entries.delete(index);
      changed = true;
    }

    for (const index of wanted) {
      const existing = this.#entries.get(index);
      if (existing && existing.status !== 'error') continue;
      this.#start(index);
      changed = true;
    }

    if (changed) this.#emit();
  }

  subscribe(fn: () => void): () => void {
    this.#listeners.add(fn);
    return () => this.#listeners.delete(fn);
  }

  /** Recarrega uma página com erro ou que está demorando (aborta a tentativa atual). */
  retry(index: number): void {
    const entry = this.#entries.get(index);
    if (!entry || entry.status === 'ready') return;
    this.#evict(entry);
    this.#start(index);
    this.#emit();
  }

  /**
   * Libera todas as páginas (aborta e revoga). O cache continua utilizável:
   * o próximo `setWindow` recarrega. Isso importa no StrictMode do React, que
   * desmonta e remonta efeitos na mesma instância.
   */
  release(): void {
    if (this.#entries.size === 0) return;
    for (const entry of this.#entries.values()) this.#evict(entry);
    this.#entries.clear();
    this.#emit();
  }

  #start(index: number) {
    const ctrl = new AbortController();
    const entry: InternalEntry = { status: 'loading', ctrl };
    this.#entries.set(index, entry);

    this.load(index, ctrl.signal).then(
      (blob) => {
        if (this.#entries.get(index) !== entry) return; // saiu da janela ou foi recarregada
        this.#entries.set(index, { status: 'ready', url: this.#createUrl(blob) });
        this.#emit();
      },
      (err: unknown) => {
        if (this.#entries.get(index) !== entry || ctrl.signal.aborted) return;
        const error = err instanceof Error ? err : new Error(String(err));
        this.#entries.set(index, { status: 'error', error });
        this.#emit();
      },
    );
  }

  #evict(entry: InternalEntry) {
    if (entry.status === 'loading') entry.ctrl?.abort();
    if (entry.status === 'ready') this.#revokeUrl(entry.url);
  }

  #emit() {
    this.#version++;
    for (const fn of this.#listeners) fn();
  }
}

/** Índices [center - radius, center + radius] limitados a [0, count). */
export function windowAround(center: number, radius: number, count: number): number[] {
  const out: number[] = [];
  for (let i = Math.max(0, center - radius); i <= Math.min(count - 1, center + radius); i++) {
    out.push(i);
  }
  return out;
}

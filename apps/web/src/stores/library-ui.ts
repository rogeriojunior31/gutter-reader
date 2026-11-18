import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { ReadStatus } from '../db/progress.ts';

export type LibrarySort = 'name' | 'added' | 'recent' | 'year';
/** Frente = capas, Lado = lombadas na estante, Lista = linhas com detalhes. */
export type LibraryView = 'front' | 'side' | 'list';
export type ShelfSize = 'sm' | 'md' | 'lg';
export type StatusFilter = 'all' | ReadStatus;

interface LibraryUiState {
  query: string;
  sort: LibrarySort;
  view: LibraryView;
  size: ShelfSize;
  status: StatusFilter;
  genres: string[];
  /** Última estante aberta na Biblioteca (`null` = todas). */
  lastShelf: string | null;
  setLastShelf: (s: string | null) => void;
  setQuery: (q: string) => void;
  setSort: (s: LibrarySort) => void;
  setView: (v: LibraryView) => void;
  setSize: (s: ShelfSize) => void;
  setStatus: (s: StatusFilter) => void;
  toggleGenre: (g: string) => void;
  clearFilters: () => void;
}

/** Anima a troca de visão quando o navegador tem View Transitions. */
function transition(update: () => void) {
  const doc = document as Document & {
    startViewTransition?: (cb: () => void) => { finished: Promise<void>; ready: Promise<void> };
  };
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (doc.startViewTransition && !reduce) {
    const t = doc.startViewTransition(update);
    t.ready.catch(() => {});
    t.finished.catch(() => {});
  } else update();
}

/** Estado de UI da biblioteca. Ordenação, visão e tamanho persistem por navegador. */
export const useLibraryUi = create<LibraryUiState>()(
  persist(
    (set) => ({
      query: '',
      sort: 'name',
      view: 'front',
      size: 'md',
      status: 'all',
      genres: [],
      lastShelf: null,
      setLastShelf: (lastShelf) => set({ lastShelf }),
      setQuery: (query) => set({ query }),
      setSort: (sort) => set({ sort }),
      setView: (view) => transition(() => set({ view })),
      setSize: (size) => transition(() => set({ size })),
      setStatus: (status) => set({ status }),
      toggleGenre: (g) =>
        set((s) => ({
          genres: s.genres.includes(g) ? s.genres.filter((x) => x !== g) : [...s.genres, g],
        })),
      clearFilters: () => set({ query: '', status: 'all', genres: [] }),
    }),
    {
      name: 'gutter.library-ui',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ sort: s.sort, view: s.view, size: s.size, lastShelf: s.lastShelf }),
      // v0 guardava 'grid' | 'list'.
      migrate: (old) => {
        const o = (old ?? {}) as { view?: string };
        return { ...o, view: o.view === 'list' ? 'list' : 'front' } as Partial<LibraryUiState>;
      },
    },
  ),
);

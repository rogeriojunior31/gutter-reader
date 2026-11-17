import { LayoutGrid, Library, List } from 'lucide-react';
import type { LibraryView, ShelfSize } from '../stores/library-ui.ts';
import { useLibraryUi } from '../stores/library-ui.ts';

const VIEWS: { id: LibraryView; label: string; icon: typeof LayoutGrid }[] = [
  { id: 'front', label: 'Frente', icon: LayoutGrid },
  { id: 'side', label: 'Lado', icon: Library },
  { id: 'list', label: 'Lista', icon: List },
];
const SIZES: { id: ShelfSize; label: string; full: string }[] = [
  { id: 'sm', label: 'P', full: 'Pequeno' },
  { id: 'md', label: 'M', full: 'Médio' },
  { id: 'lg', label: 'G', full: 'Grande' },
];

const GROUP = 'flex rounded-lg bg-ink-850 p-0.5 ring-1 ring-white/10';
const ITEM =
  'inline-flex min-h-9 min-w-9 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs transition-colors pointer-coarse:min-h-11 pointer-coarse:min-w-11';
const ON = 'bg-ink-600 font-semibold text-ink-50';
const OFF = 'text-ink-300 hover:text-ink-50';

/** Frente (capas) / Lado (lombadas) / Lista, e o tamanho das peças. */
export function ViewControls({ withList = true }: { withList?: boolean }) {
  const { view, size, setView, setSize } = useLibraryUi();
  const current = !withList && view === 'list' ? 'front' : view;
  const views = withList ? VIEWS : VIEWS.filter((v) => v.id !== 'list');

  return (
    <div className="flex items-center gap-2">
      {/* biome-ignore lint/a11y/useSemanticElements: grupo de botões de alternância */}
      <div role="group" aria-label="Visão" className={GROUP}>
        {views.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={current === id}
            onClick={() => setView(id)}
            className={`${ITEM} ${current === id ? ON : OFF}`}
          >
            <Icon className="size-4" aria-hidden="true" />
            <span className="max-sm:sr-only">{label}</span>
          </button>
        ))}
      </div>
      {current !== 'list' && (
        // biome-ignore lint/a11y/useSemanticElements: grupo de botões de alternância
        <div role="group" aria-label="Tamanho" className={GROUP}>
          {SIZES.map(({ id, label, full }) => (
            <button
              key={id}
              type="button"
              aria-pressed={size === id}
              aria-label={full}
              title={full}
              onClick={() => setSize(id)}
              className={`${ITEM} w-9 pointer-coarse:w-11 ${size === id ? ON : OFF}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Larguras mínimas da grade de capas por tamanho. */
export const COVER_GRID_BY_SIZE: Record<ShelfSize, string> = {
  sm: 'grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-x-3 gap-y-5 [--ledge-gap:0.75rem]',
  md: 'grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-x-4 gap-y-7 [--ledge-gap:1rem] sm:grid-cols-[repeat(auto-fill,minmax(160px,1fr))]',
  lg: 'grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-x-5 gap-y-8 [--ledge-gap:1.25rem] sm:grid-cols-[repeat(auto-fill,minmax(220px,1fr))]',
};

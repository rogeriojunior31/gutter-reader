import type { Series } from '@gutter/core';
import { Link } from 'react-router';
import { useCoverColor } from '../lib/cover-color.ts';

export interface ShelfGroup {
  /** `null` = todas as estantes. */
  id: string | null;
  name: string;
  series: Series[];
}

/** Séries sem pasta de estante (soltas na raiz) quando as outras têm. */
export const OTHER_SHELF = '__outras__';

/** Agrupa as séries por estante; vazio quando a biblioteca não tem estantes. */
export function groupShelves(series: readonly Series[]): ShelfGroup[] {
  const by = new Map<string, Series[]>();
  for (const s of series) {
    const key = s.shelf ?? OTHER_SHELF;
    by.set(key, [...(by.get(key) ?? []), s]);
  }
  if (!by.size || (by.size === 1 && by.has(OTHER_SHELF))) return [];
  return [...by.entries()]
    .map(([id, list]) => ({ id, name: id === OTHER_SHELF ? 'Outras' : id, series: list }))
    .sort((a, b) =>
      a.id === OTHER_SHELF ? 1 : b.id === OTHER_SHELF ? -1 : a.name.localeCompare(b.name, 'pt-BR'),
    );
}

/** Alturas fixas das lombadas da placa: a prateleira não "pula" entre estantes. */
const HEIGHTS = [0.82, 1, 0.74, 0.92, 0.66];

/**
 * Estantes como ambientes: cada placa tem uma mini-prateleira com as cores das
 * capas daquela estante. Links (e não abas) para o endereço guardar a estante.
 */
export function ShelfTabs({
  groups,
  all,
  current,
  onPick,
}: {
  groups: ShelfGroup[];
  all: Series[];
  current: string | null;
  onPick: (id: string | null) => void;
}) {
  const items: ShelfGroup[] = [{ id: null, name: 'Todas', series: all }, ...groups];
  return (
    <nav aria-label="Estantes" className="-mx-4 mb-4 sm:-mx-8">
      <ul className="flex snap-x scroll-px-4 gap-2 overflow-x-auto px-4 pt-3 pb-2 max-sm:pr-12 max-sm:[mask-image:linear-gradient(to_right,black_82%,transparent)] sm:scroll-px-8 sm:px-8">
        {items.map((g) => {
          const active = g.id === current;
          const books = g.series.reduce((n, s) => n + s.bookCount, 0);
          return (
            <li key={g.id ?? 'todas'} className="snap-start">
              <Link
                to={
                  g.id ? `/library?estante=${encodeURIComponent(g.id)}` : '/library?estante=todas'
                }
                onClick={() => onPick(g.id)}
                aria-current={active ? 'page' : undefined}
                className={`group flex min-w-36 flex-col rounded-xl px-3 pt-3 pb-2.5 transition-colors ${
                  active ? 'bg-ink-800 ring-1 ring-white/15' : 'hover:bg-ink-850'
                }`}
              >
                <span aria-hidden="true" className="flex h-11 items-end gap-[3px] px-1">
                  {g.series.slice(0, HEIGHTS.length).map((s, i) => (
                    <Sliver
                      key={s.id}
                      bookId={s.coverBookId}
                      height={HEIGHTS[i] ?? 1}
                      lifted={active}
                    />
                  ))}
                </span>
                <span aria-hidden="true" className="block h-1.5 bg-ink-700" />
                <span
                  className={`mt-2 truncate pt-[0.1em] font-display font-extrabold text-xl uppercase leading-none tracking-wide ${
                    active ? 'text-ink-50' : 'text-ink-200 group-hover:text-ink-50'
                  }`}
                >
                  {g.name}
                </span>
                <span className="mt-1 text-ink-300 text-xs tabular-nums">
                  {g.series.length} {g.series.length === 1 ? 'série' : 'séries'} · {books}{' '}
                  {books === 1 ? 'livro' : 'livros'}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Sliver({
  bookId,
  height,
  lifted,
}: {
  bookId: string | undefined;
  height: number;
  lifted: boolean;
}) {
  const color = useCoverColor(bookId);
  return (
    <span
      className={`block w-3.5 rounded-t-[2px] shadow-[inset_-2px_0_3px_-1px_rgb(0_0_0/0.45),inset_1px_0_2px_-1px_rgb(255_255_255/0.15)] transition-transform duration-300 motion-reduce:transition-none ${
        lifted ? '' : 'opacity-70 group-hover:opacity-100'
      } ${lifted && height === 1 ? '-translate-y-1' : ''}`}
      style={{ height: `${height * 100}%`, backgroundColor: color ?? 'var(--color-ink-600)' }}
    />
  );
}

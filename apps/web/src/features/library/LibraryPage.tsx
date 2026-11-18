import { naturalCompare, type Series } from '@gutter/core';
import { Check, ChevronDown, Search, SearchX, SlidersHorizontal, X } from 'lucide-react';
import { useEffect, useMemo, useRef } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Cover } from '../../components/Cover.tsx';
import { OpenFolderButton } from '../../components/OpenFolderButton.tsx';
import { Popover } from '../../components/Popover.tsx';
import { SeriesCard } from '../../components/SeriesCard.tsx';
import { groupShelves, ShelfTabs } from '../../components/ShelfTabs.tsx';
import { Spine, SpineShelf } from '../../components/Spine.tsx';
import {
  Badge,
  buttonClass,
  EmptyState,
  ErrorState,
  PageHeader,
  Segmented,
} from '../../components/ui.tsx';
import { COVER_GRID_BY_SIZE, ViewControls } from '../../components/ViewControls.tsx';
import { readStatus, type SeriesStats, seriesProgress, useSeriesStats } from '../../db/progress.ts';
import { useSeriesList } from '../../lib/queries.ts';
import { useMediaQuery } from '../../lib/use-media-query.ts';
import { useSource } from '../../sources/source-context.tsx';
import { useSourceStore } from '../../sources/source-store.ts';
import { type LibrarySort, type StatusFilter, useLibraryUi } from '../../stores/library-ui.ts';
import { contributorsLine, STATUS_LABEL, STATUS_TONE } from '../series/labels.ts';

const SORTS: [LibrarySort, string][] = [
  ['name', 'Nome'],
  ['added', 'Adicionado'],
  ['recent', 'Lido recentemente'],
  ['year', 'Ano'],
];
const STATUSES: [StatusFilter, string][] = [
  ['all', 'Todos'],
  ['unread', 'Não lidos'],
  ['reading', 'Lendo'],
  ['read', 'Lidos'],
];

/** Texto pesquisável da série: nome, autores, gêneros, tags e editora. */
function haystack(s: Series): string {
  const m = s.metadata;
  return [
    s.name,
    m?.publisher,
    ...(m?.contributors?.map((c) => c.name) ?? []),
    ...(m?.genres ?? []),
    ...(m?.tags ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase();
}

const field =
  'h-10 rounded-lg border border-white/15 bg-ink-850 text-sm pointer-coarse:h-11 focus-visible:border-obi-500/70';

export function LibraryPage() {
  const { data: allSeries, isPending, error, refetch } = useSeriesList();
  const ui = useLibraryUi();
  const [params] = useSearchParams();

  // Estantes (ambientes): o endereço manda; sem ele, volta para a última aberta.
  const shelves = useMemo(() => groupShelves(allSeries ?? []), [allSeries]);
  const param = params.get('estante');
  const wanted = param === 'todas' ? null : (param ?? ui.lastShelf);
  const shelf = shelves.find((g) => g.id === wanted) ?? null;
  const series = shelf ? shelf.series : allSeries;
  const { lastShelf, setLastShelf } = ui;
  useEffect(() => {
    if (param !== null && (param === 'todas' ? null : param) !== lastShelf) {
      setLastShelf(param === 'todas' ? null : param);
    }
  }, [param, lastShelf, setLastShelf]);
  const source = useSource();
  const skipped = useSourceStore((s) => s.skipped);
  const search = useRef<HTMLInputElement>(null);
  // No celular, ordenação, visão e tamanho ficam num botão só: as capas sobem.
  const roomy = useMediaQuery('(min-width: 640px)');

  // "/" foca a busca (convenção de GitHub, YouTube etc.), exceto quando já se digita algo.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      if (
        e.target instanceof HTMLElement &&
        e.target.closest('input, textarea, select, [contenteditable]')
      )
        return;
      e.preventDefault();
      search.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  const stats = useSeriesStats();

  const allGenres = useMemo(() => {
    const count = new Map<string, number>();
    for (const s of series ?? []) {
      for (const g of s.metadata?.genres ?? []) count.set(g, (count.get(g) ?? 0) + 1);
    }
    return [...count.entries()].sort((a, b) => b[1] - a[1] || naturalCompare(a[0], b[0]));
  }, [series]);

  const visible = useMemo(() => {
    const q = ui.query.trim().toLocaleLowerCase();
    const list = (series ?? []).filter((s) => {
      if (q && !haystack(s).includes(q)) return false;
      if (ui.status !== 'all' && readStatus(stats.get(s.id), s.bookCount) !== ui.status)
        return false;
      if (ui.genres.length && !ui.genres.every((g) => s.metadata?.genres?.includes(g)))
        return false;
      return true;
    });
    return list.sort((a, b) => {
      if (ui.sort === 'added') return b.addedAt - a.addedAt;
      if (ui.sort === 'year') {
        const diff = (b.metadata?.year ?? 0) - (a.metadata?.year ?? 0);
        if (diff) return diff;
      }
      if (ui.sort === 'recent') {
        const diff = (stats.get(b.id)?.lastReadAt ?? 0) - (stats.get(a.id)?.lastReadAt ?? 0);
        if (diff) return diff;
      }
      return naturalCompare(a.name, b.name);
    });
  }, [series, ui.query, ui.status, ui.genres, ui.sort, stats]);

  const filtering = !!ui.query || ui.status !== 'all' || ui.genres.length > 0;
  const totalBooks = series?.reduce((n, s) => n + s.bookCount, 0) ?? 0;

  return (
    <div>
      <PageHeader
        title={shelf ? shelf.name : 'Biblioteca'}
        subtitle={
          series &&
          `${shelf ? 'Estante · ' : ''}${
            filtering
              ? `${visible.length} de ${series.length} séries`
              : `${series.length} séries · ${totalBooks} livros`
          }`
        }
        actions={
          <OpenFolderButton className="max-sm:hidden">
            {source.kind === 'mock' ? 'Abrir pasta' : 'Trocar pasta'}
          </OpenFolderButton>
        }
      />

      {shelves.length > 0 && allSeries && (
        <ShelfTabs
          groups={shelves}
          all={allSeries}
          current={shelf?.id ?? null}
          onPick={setLastShelf}
        />
      )}

      {/* Barra de busca e filtros */}
      <div className="-mx-4 mb-6 space-y-3 bg-ink-900/95 px-4 py-3 backdrop-blur sm:-mx-8 sm:px-8 relative z-20 lg:sticky lg:top-0">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-0 flex-1 basis-56">
            <Search
              aria-hidden="true"
              className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-ink-300"
            />
            <input
              type="search"
              ref={search}
              aria-label="Buscar na biblioteca"
              aria-keyshortcuts="/"
              placeholder="Título, autor ou gênero…"
              value={ui.query}
              onChange={(e) => ui.setQuery(e.target.value)}
              className={`${field} peer w-full pr-10 pl-9 placeholder:text-ink-300`}
            />
            {!ui.query && (
              // Dica visual; o atalho em si é anunciado pelo aria-keyshortcuts do campo.
              <span
                aria-hidden="true"
                className="-translate-y-1/2 pointer-events-none absolute top-1/2 right-3 hidden rounded border border-white/15 px-1.5 text-[11px] text-ink-300 peer-focus:hidden pointer-fine:block"
              >
                /
              </span>
            )}
          </div>
          {roomy ? (
            <>
              <SortSelect value={ui.sort} onChange={ui.setSort} />
              <ViewControls />
            </>
          ) : (
            <Popover
              label="Exibição"
              align="end"
              trigger={({ toggle, ...aria }) => (
                <button
                  type="button"
                  onClick={toggle}
                  {...aria}
                  className={buttonClass('secondary', 'md', 'h-11')}
                >
                  <SlidersHorizontal className="size-4" aria-hidden="true" />
                  Exibição
                </button>
              )}
            >
              <div className="space-y-4 p-1">
                <div className="space-y-1.5">
                  <span className="text-ink-300 text-xs">Ordenar por</span>
                  <SortSelect value={ui.sort} onChange={ui.setSort} full />
                </div>
                <div className="space-y-1.5">
                  <span className="text-ink-300 text-xs">Visão e tamanho</span>
                  <div className="[&>div]:flex-wrap">
                    <ViewControls />
                  </div>
                </div>
              </div>
            </Popover>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label="Status de leitura"
            options={STATUSES}
            value={ui.status}
            onChange={ui.setStatus}
            className="max-sm:w-full"
          />
          <Popover
            label="Filtrar por gênero"
            trigger={({ toggle, ...aria }) => (
              <button
                type="button"
                onClick={toggle}
                {...aria}
                className={buttonClass('secondary', 'md', 'h-10 pointer-coarse:h-11')}
              >
                Gêneros
                {ui.genres.length > 0 && (
                  <span className="rounded-full bg-ink-900/20 px-1.5 text-xs tabular-nums">
                    {ui.genres.length}
                  </span>
                )}
                <ChevronDown className="size-4" aria-hidden="true" />
              </button>
            )}
          >
            <div className="max-h-80 overflow-y-auto">
              {allGenres.map(([g, n]) => {
                const on = ui.genres.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    aria-pressed={on}
                    onClick={() => ui.toggleGenre(g)}
                    className="flex min-h-10 w-full items-center gap-3 rounded-lg px-2.5 text-left text-sm hover:bg-white/5 pointer-coarse:min-h-11"
                  >
                    <span
                      className={`grid size-4 shrink-0 place-items-center rounded border ${
                        on ? 'border-ink-100 bg-ink-100 text-ink-900' : 'border-white/25'
                      }`}
                    >
                      {on && <Check className="size-3" strokeWidth={3} />}
                    </span>
                    <span className="flex-1">{g}</span>
                    <span className="text-ink-300 text-xs tabular-nums">{n}</span>
                  </button>
                );
              })}
            </div>
          </Popover>

          {ui.genres.map((g) => (
            <button
              key={g}
              type="button"
              onClick={() => ui.toggleGenre(g)}
              aria-label={`Remover filtro ${g}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-ink-600 pr-2 pl-3 text-ink-50 text-xs hover:bg-ink-500 pointer-coarse:h-11"
            >
              {g} <X className="size-3.5" aria-hidden="true" />
            </button>
          ))}

          {filtering && (
            <button
              type="button"
              onClick={ui.clearFilters}
              className="inline-flex h-8 items-center px-2 text-ink-200 text-xs underline-offset-4 hover:text-white hover:underline pointer-coarse:h-11"
            >
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {skipped > 0 && (
        <p className="mb-6 text-ink-200 text-sm">
          {skipped} {skipped === 1 ? 'arquivo ficou' : 'arquivos ficaram'} de fora: PDF e CB7 ainda
          não são lidos (CBZ e CBR já).
        </p>
      )}

      {error && (
        <ErrorState
          title="Não deu para carregar a biblioteca."
          detail={error.message}
          onRetry={() => void refetch()}
        />
      )}

      {isPending && (
        <div className={COVER_GRID_BY_SIZE[ui.size]}>
          {Array.from({ length: 12 }, (_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: skeleton estático
            <div key={i} className="aspect-[2/3] animate-pulse rounded-lg bg-ink-850" />
          ))}
        </div>
      )}

      {series && visible.length === 0 && (
        <EmptyState
          icon={<SearchX className="size-5" />}
          title={
            shelf ? `Nada em ${shelf.name} com esses filtros` : 'Nenhuma série com esses filtros'
          }
        >
          {shelf && (
            <>
              <Link
                to="/library?estante=todas"
                onClick={() => setLastShelf(null)}
                className="text-obi-300 underline-offset-4 hover:underline"
              >
                Procure em todas as estantes
              </Link>
              ,{' '}
            </>
          )}
          {shelf ? 'tente outro termo' : 'Tente outro termo'} ou{' '}
          <button
            type="button"
            onClick={ui.clearFilters}
            className="text-obi-300 underline-offset-4 hover:underline"
          >
            limpe os filtros
          </button>
          .
        </EmptyState>
      )}

      {ui.view === 'front' && (
        <div className={COVER_GRID_BY_SIZE[ui.size]}>
          {visible.map((s) => (
            <SeriesCard key={s.id} series={s} stats={stats.get(s.id)} />
          ))}
        </div>
      )}
      {ui.view === 'side' && visible.length > 0 && (
        <SpineShelf size={ui.size} label="Séries na estante">
          {visible.map((s) => {
            const st = stats.get(s.id);
            const status = readStatus(st, s.bookCount);
            return (
              <Spine
                key={s.id}
                to={`/series/${s.id}`}
                coverBookId={s.coverBookId}
                number={String(s.bookCount)}
                unit={s.bookCount === 1 ? 'livro' : 'livros'}
                turnId={s.id}
                spineTitle={s.name}
                label={s.metadata?.year ? String(s.metadata.year) : s.rtl ? 'Mangá' : 'Série'}
                ariaLabel={s.name}
                detail={`${s.bookCount} ${s.bookCount === 1 ? 'livro' : 'livros'}${st?.completed ? ` · ${st.completed} lidos` : ''}`}
                status={status}
                progress={seriesProgress(st, s.bookCount)}
                weight={Math.log2(s.bookCount + 1)}
                size={ui.size}
              />
            );
          })}
        </SpineShelf>
      )}
      {ui.view === 'list' && (
        <div className="divide-y divide-white/5 overflow-hidden rounded-xl border border-white/10">
          {visible.map((s) => (
            <SeriesRow key={s.id} series={s} stats={stats.get(s.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function SortSelect({
  value,
  onChange,
  full = false,
}: {
  value: LibrarySort;
  onChange: (s: LibrarySort) => void;
  full?: boolean;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as LibrarySort)}
      aria-label="Ordenar por"
      className={`${field} px-3 text-ink-50 ${full ? 'w-full' : ''}`}
    >
      {SORTS.map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </select>
  );
}

function SeriesRow({ series, stats }: { series: Series; stats: SeriesStats | undefined }) {
  const m = series.metadata;
  const status = readStatus(stats, series.bookCount);
  return (
    <Link
      to={`/series/${series.id}`}
      className="group flex items-center gap-4 bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.05]"
    >
      <div className="w-12 shrink-0">
        <Cover bookId={series.coverBookId} alt="" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium group-hover:text-obi-300">{series.name}</p>
        <p className="truncate text-ink-300 text-sm">
          {[contributorsLine(m?.contributors), m?.year].filter(Boolean).join(' · ')}
        </p>
        {/* Celular e tablet: a coluna de contagem/status some, então ela vem para cá. */}
        <p className="mt-0.5 truncate text-ink-300 text-xs md:hidden">
          {series.bookCount} {series.bookCount === 1 ? 'livro' : 'livros'}
          {m?.status ? ` · ${STATUS_LABEL[m.status]}` : ''}
        </p>
        <div className="mt-1.5 hidden flex-wrap gap-1 sm:flex">
          {m?.genres?.slice(0, 3).map((g) => (
            <Badge key={g}>{g}</Badge>
          ))}
        </div>
      </div>
      <div className="hidden shrink-0 text-right text-sm md:block">
        <p className="text-ink-100">
          {series.bookCount} {series.bookCount === 1 ? 'livro' : 'livros'}
        </p>
        {m?.status && (
          <p className="mt-1">
            <Badge tone={STATUS_TONE[m.status]}>{STATUS_LABEL[m.status]}</Badge>
          </p>
        )}
      </div>
      <div className="w-20 shrink-0 text-right sm:w-24">
        {status === 'read' ? (
          <Badge tone="gold">Lido</Badge>
        ) : status === 'reading' ? (
          <div className="ml-auto w-20">
            <div className="h-1 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full bg-obi-600"
                style={{ width: `${(seriesProgress(stats, series.bookCount) ?? 0) * 100}%` }}
              />
            </div>
            <p className="mt-1 text-[11px] text-ink-200">
              {stats?.completed}/{series.bookCount} lidos
            </p>
          </div>
        ) : (
          // Não lido é o estado padrão: sem ruído visual, só para leitor de tela.
          <span className="sr-only">Não lido</span>
        )}
      </div>
    </Link>
  );
}

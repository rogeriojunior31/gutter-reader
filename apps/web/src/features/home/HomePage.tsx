import type { Series } from '@gutter/core';
import { ArrowRight, BookOpen, Flame, Layers, Plus } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ContinueCard } from '../../components/ContinueCard.tsx';
import { Cover } from '../../components/Cover.tsx';
import { OpenFolderButton } from '../../components/OpenFolderButton.tsx';
import { SeriesCard } from '../../components/SeriesCard.tsx';
import { Ledge, Spine, SpineBand, SpineShelf, turnName } from '../../components/Spine.tsx';
import { Button, buttonClass } from '../../components/ui.tsx';
import { COVER_GRID_BY_SIZE, ViewControls } from '../../components/ViewControls.tsx';
import { useActivity } from '../../db/activity.ts';
import { useCollections } from '../../db/collections.ts';
import type { StoredProgress } from '../../db/db.ts';
import {
  readStatus,
  seriesProgress,
  useContinueReading,
  useSeriesProgress,
  useSeriesStats,
} from '../../db/progress.ts';
import {
  useBook,
  useBooks,
  useSeries,
  useSeriesList,
  useSeriesMap,
  useThumbnailUrl,
} from '../../lib/queries.ts';
import { useSource } from '../../sources/source-context.tsx';
import { useSourceStore } from '../../sources/source-store.ts';
import { useLibraryUi } from '../../stores/library-ui.ts';
import { CollectionCard, CollectionFormDialog } from '../collections/components.tsx';

/** Quantas capas cada seção do Início mostra antes do "Ver tudo". */
const PER_SECTION = 12;
/** Até quantas séries o Início mostra volumes em vez de séries. */
const FEW_SERIES = 2;

function SectionHead({ title, to, actions }: { title: string; to?: string; actions?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2">
      <h2 className="font-display font-extrabold text-2xl uppercase tracking-wide">{title}</h2>
      {to && (
        <Link
          to={to}
          className="inline-flex min-h-9 items-center rounded-md px-2 text-ink-300 text-xs underline-offset-4 hover:text-obi-300 hover:underline pointer-coarse:min-h-11"
        >
          Ver tudo
        </Link>
      )}
      {actions && <div className="ml-auto">{actions}</div>}
    </div>
  );
}

export function HomePage() {
  const continueReading = useContinueReading();
  const { data: allSeries } = useSeriesList();
  const seriesMap = useSeriesMap();
  const stats = useSeriesStats();
  const collections = useCollections();
  const [creating, setCreating] = useState(false);
  const { view, size } = useLibraryUi();

  const recent = useMemo(
    () => [...(allSeries ?? [])].sort((a, b) => b.addedAt - a.addedAt).slice(0, PER_SECTION),
    [allSeries],
  );
  const [current, ...rest] = continueReading;
  const pinned = collections?.filter((c) => c.pinned && c.seriesIds.length > 0) ?? [];
  const grid = COVER_GRID_BY_SIZE[size];

  return (
    <div className="space-y-14">
      {current ? <ResumeHero progress={current} /> : <WelcomeHero series={recent} />}

      {rest.length > 0 && (
        <section>
          <SectionHead title="Continuar lendo" />
          <div className={grid}>
            {rest.slice(0, PER_SECTION).map((p) => (
              <ContinueCard key={p.bookId} progress={p} />
            ))}
          </div>
        </section>
      )}

      {pinned.map((c) => (
        <section key={c.id}>
          <SectionHead title={c.name} to={`/collections/${c.id}`} />
          <div className={grid}>
            {c.seriesIds.slice(0, PER_SECTION).map((id) => {
              const s = seriesMap.get(id);
              return s ? <SeriesCard key={id} series={s} stats={stats.get(id)} /> : null;
            })}
          </div>
        </section>
      ))}

      {/* Poucas séries (uma pasta por série é comum): a estante de séries ficaria com
          uma lombada solitária. Mostra os próximos volumes de cada série. */}
      {recent.length > 0 && recent.length <= FEW_SERIES ? (
        recent.map((s) => <NextVolumes key={s.id} series={s} />)
      ) : (
        <section>
          <SectionHead
            title="Sua estante"
            to="/library"
            actions={<ViewControls withList={false} />}
          />
          {view === 'side' ? (
            <SpineShelf size={size} label="Sua estante">
              {recent.map((s) => {
                const st = stats.get(s.id);
                return (
                  <Spine
                    key={s.id}
                    to={`/series/${s.id}`}
                    coverBookId={s.coverBookId}
                    turnId={s.id}
                    number={String(s.bookCount)}
                    unit={s.bookCount === 1 ? 'livro' : 'livros'}
                    spineTitle={s.name}
                    label={s.metadata?.year ? String(s.metadata.year) : 'Série'}
                    ariaLabel={s.name}
                    detail={`${s.bookCount} ${s.bookCount === 1 ? 'livro' : 'livros'}`}
                    status={readStatus(st, s.bookCount)}
                    progress={seriesProgress(st, s.bookCount)}
                    weight={Math.log2(s.bookCount + 1)}
                    size={size}
                  />
                );
              })}
            </SpineShelf>
          ) : (
            <div className={grid}>
              {recent.map((s) => (
                <SeriesCard key={s.id} series={s} stats={stats.get(s.id)} />
              ))}
            </div>
          )}
        </section>
      )}

      <section>
        <SectionHead title="Suas coleções" to={collections?.length ? '/collections' : undefined} />
        {collections?.length ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {collections.slice(0, 5).map((c) => (
              <CollectionCard key={c.id} collection={c} seriesMap={seriesMap} />
            ))}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-white/10 border-dashed p-5">
            <div className="grid size-10 place-items-center rounded-full bg-white/5 text-ink-300">
              <Layers className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-sm">Organize do seu jeito</p>
              <p className="text-ink-300 text-sm">
                Junte séries em coleções como “Favoritos” ou “Ler nas férias”.
              </p>
            </div>
            <Button onClick={() => setCreating(true)}>
              <Plus className="size-4" /> Criar coleção
            </Button>
          </div>
        )}
      </section>

      <CollectionFormDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}

/** Link discreto da sequência de dias: informa, não compete com "Continuar". */
function StreakLink() {
  const activity = useActivity(7);
  if (!activity) return null;
  const { current, atRisk } = activity.streak;
  const text =
    current === 0
      ? 'Comece sua sequência de leitura'
      : atRisk
        ? `${current} ${current === 1 ? 'dia' : 'dias'} de sequência · leia hoje para manter`
        : `${current} ${current === 1 ? 'dia' : 'dias'} de sequência`;
  return (
    <Link
      to="/activity"
      className="mt-5 inline-flex items-center gap-1.5 rounded-md py-1 text-gold-300 text-sm hover:text-gold-200"
    >
      <Flame className="size-4" aria-hidden="true" />
      {text}
      <ArrowRight className="size-3.5" aria-hidden="true" />
    </Link>
  );
}

/**
 * O volume que você está lendo, tirado da estante: a lombada fica em pé sobre a
 * prateleira e a capa sobe ao lado, com a cinta marcando quanto falta.
 */
function ResumeHero({ progress }: { progress: StoredProgress }) {
  const { data: book } = useBook(progress.bookId);
  const { data: series } = useSeries(book?.seriesId);
  const cover = useThumbnailUrl(progress.bookId);
  const pct = Math.round(((progress.page + 1) / progress.pageCount) * 100);
  const left = Math.max(0, progress.pageCount - progress.page - 1);
  const number = book?.title.replace(/^(#|Vol\.\s*|Cap\.\s*)/, '') ?? '';

  return (
    <section className="rounded-3xl border border-white/10 bg-ink-850 p-6 sm:p-10">
      <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:gap-12">
        {/* Palco: lombada + capa sobre a prateleira */}
        <Link
          to={`/read/${progress.bookId}`}
          aria-label={`Continuar ${series?.name ?? ''} ${book?.title ?? ''}`}
          className="group shrink-0 self-start rounded-md sm:self-auto"
        >
          <span className="flex items-end gap-1.5 px-2">
            <SpineBand
              coverBookId={progress.bookId}
              number={number}
              spineTitle={series?.name ?? ''}
              label={book?.format.toUpperCase()}
              status="reading"
              progress={pct / 100}
              size="sm"
              className="h-[188px] w-12 sm:h-[230px] sm:w-14"
            />
            <span className="relative block w-32 -translate-y-2 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:-translate-y-4 sm:w-40 motion-reduce:transition-none">
              {cover ? (
                <img
                  src={cover}
                  alt=""
                  className="aspect-[2/3] w-full rounded-md object-cover shadow-2xl shadow-black/60 ring-1 ring-white/10"
                />
              ) : (
                <span className="block aspect-[2/3] animate-pulse rounded-md bg-ink-800" />
              )}
              <span
                aria-hidden="true"
                className="absolute bottom-[12%] left-0 flex h-[15%] min-h-7 items-center whitespace-nowrap bg-obi-600 pl-2.5 font-display font-extrabold text-white uppercase leading-none shadow-lg shadow-black/40 sm:text-lg"
                style={{ width: `${Math.max(34, 100 - pct)}%` }}
              >
                faltam {left}
              </span>
            </span>
          </span>
          <span
            aria-hidden="true"
            className="block h-3 bg-ink-700 shadow-[0_10px_16px_-10px_rgb(0_0_0/0.8)]"
          />
        </Link>

        <div className="min-w-0 flex-1 sm:pb-3">
          <h1 className="line-clamp-2 pt-[0.14em] font-display font-extrabold text-4xl uppercase leading-[0.92] tracking-wide sm:text-6xl">
            {series?.name ?? ' '}
          </h1>
          <p className="mt-1 text-ink-100 sm:text-lg">
            {book && book.title !== series?.name ? `${book.title} · ` : ''}
            página {progress.page + 1} de {progress.pageCount}
          </p>
          {series?.metadata?.summary && (
            <p className="mt-3 line-clamp-2 max-w-[65ch] text-ink-200 text-sm">
              {series.metadata.summary}
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-2">
            <Link to={`/read/${progress.bookId}`} className={buttonClass('primary')}>
              Continuar lendo
            </Link>
            {series && (
              <Link to={`/series/${series.id}`} className={buttonClass('secondary')}>
                Ver série
              </Link>
            )}
          </div>
          <StreakLink />
        </div>
      </div>
    </section>
  );
}

/** Boas-vindas: as lombadas da própria coleção são a ilustração. */
function WelcomeHero({ series }: { series: Series[] }) {
  const source = useSource();
  const label = useSourceStore((s) => s.label);
  const local = source.kind !== 'mock';

  return (
    <section className="grid gap-8 overflow-hidden rounded-3xl border border-white/10 bg-ink-850 p-8 sm:p-12 lg:grid-cols-[1fr_auto] lg:items-end">
      <div>
        <h1 className="max-w-2xl pt-[0.1em] font-display font-extrabold text-5xl uppercase leading-[0.92] tracking-wide sm:text-7xl">
          {local ? `Tudo pronto em “${label}”.` : 'Sua estante de HQs e mangás.'}
        </h1>
        <p className="mt-3 max-w-[55ch] text-ink-100">
          {local
            ? 'Escolha uma série para começar. O que você ler aparece aqui para continuar depois.'
            : 'Escolha a pasta onde ficam seus CBZ e CBR. Nada sai do seu computador: os arquivos são lidos aqui mesmo, e o progresso fica salvo neste navegador.'}
        </p>
        {!local && (
          <p className="mt-2 text-ink-300 text-sm">
            Enquanto isso, a biblioteca abaixo é só uma demonstração.
          </p>
        )}
        <div className="mt-6 flex flex-wrap gap-2">
          {local ? (
            <Link to="/library" className={buttonClass('primary')}>
              <BookOpen className="size-4" aria-hidden="true" /> Ver biblioteca
            </Link>
          ) : (
            <>
              <OpenFolderButton variant="primary">Abrir minha pasta</OpenFolderButton>
              <Link to="/library" className={buttonClass('secondary')}>
                <BookOpen className="size-4" aria-hidden="true" /> Ver a demonstração
              </Link>
            </>
          )}
        </div>
      </div>
      {series.length > 0 && (
        <div aria-hidden="true" className="hidden lg:block">
          <div className="flex items-end gap-1.5 px-2">
            {series.slice(0, 7).map((s, i) => (
              <SpineBand
                key={s.id}
                coverBookId={s.coverBookId}
                number={String(s.bookCount)}
                unit={s.bookCount === 1 ? 'livro' : 'livros'}
                spineTitle={s.name}
                status="unread"
                size="sm"
                className="w-12"
                style={{ height: 190 + ((i * 37) % 3) * 14 }}
              />
            ))}
          </div>
          <div className="h-3 bg-ink-700 shadow-[0_10px_16px_-10px_rgb(0_0_0/0.8)]" />
        </div>
      )}
    </section>
  );
}

/** Próximos volumes não lidos de uma série, na visão escolhida (frente ou lado). */
function NextVolumes({ series }: { series: Series }) {
  const { data: books } = useBooks(series.id);
  const progress = useSeriesProgress(series.id);
  const { view, size } = useLibraryUi();
  if (!books?.length) return null;

  const firstOpen = books.findIndex((b) => !progress.get(b.id)?.completed);
  const start = Math.max(firstOpen, 0);
  const shown = books.slice(start, start + PER_SECTION);
  const title = firstOpen < 0 ? `Releia ${series.name}` : `Próximos em ${series.name}`;

  return (
    <section>
      <SectionHead
        title={title}
        to={`/series/${series.id}`}
        actions={<ViewControls withList={false} />}
      />
      {view === 'side' ? (
        <SpineShelf size={size} label={title}>
          {shown.map((b) => {
            const p = progress.get(b.id);
            const status = p?.completed ? 'read' : p && p.page > 0 ? 'reading' : 'unread';
            return (
              <Spine
                key={b.id}
                to={`/read/${b.id}`}
                coverBookId={b.id}
                turnId={b.id}
                number={b.title.replace(/^(#|Vol\.\s*|Cap\.\s*)/, '')}
                spineTitle={series.name}
                label={b.format.toUpperCase()}
                ariaLabel={b.title === series.name ? series.name : `${series.name} ${b.title}`}
                detail={
                  p?.pageCount && !p.completed
                    ? `pág. ${p.page + 1} de ${p.pageCount}`
                    : b.format.toUpperCase()
                }
                status={status}
                progress={p?.pageCount ? (p.page + 1) / p.pageCount : undefined}
                weight={b.pageCount ? b.pageCount / 24 : 1}
                size={size}
              />
            );
          })}
        </SpineShelf>
      ) : (
        <div className={COVER_GRID_BY_SIZE[size]}>
          {shown.map((b) => {
            const p = progress.get(b.id);
            return (
              <Link key={b.id} to={`/read/${b.id}`} className="group block space-y-2.5">
                <span
                  className="block transition-transform duration-200 group-hover:-translate-y-1"
                  style={{ viewTransitionName: turnName(b.id) }}
                >
                  <Cover
                    bookId={b.id}
                    alt=""
                    progress={p?.pageCount ? (p.page + 1) / p.pageCount : undefined}
                    completed={p?.completed}
                  />
                </span>
                <Ledge />
                <span className="block px-0.5">
                  <span className="block truncate font-medium text-sm group-hover:text-obi-300">
                    {b.title === series.name ? series.name : `${series.name} ${b.title}`}
                  </span>
                  <span className="block text-ink-300 text-xs">
                    {p && !p.completed && p.pageCount
                      ? `Pág. ${p.page + 1} de ${p.pageCount}`
                      : b.format.toUpperCase()}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

import type { Book, Series } from '@gutter/core';
import { ArrowLeft, Check, CheckCheck, Layers, RotateCcw } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Cover } from '../../components/Cover.tsx';
import { Ledge, Spine, SpineShelf, turnName } from '../../components/Spine.tsx';
import { Badge, Button, buttonClass, Chip, ErrorState } from '../../components/ui.tsx';
import { COVER_GRID_BY_SIZE, ViewControls } from '../../components/ViewControls.tsx';
import { useCollections, useCollectionsOfSeries } from '../../db/collections.ts';
import type { StoredProgress } from '../../db/db.ts';
import { setCompleted, setSeriesCompleted, useSeriesProgress } from '../../db/progress.ts';
import { useBooks, useSeries, useThumbnailUrl } from '../../lib/queries.ts';
import { useLibraryUi } from '../../stores/library-ui.ts';
import { toast } from '../../stores/toast.ts';

function primaryLabel(progress: StoredProgress | undefined, readCount: number) {
  if (progress && progress.page > 0) return 'Continuar';
  return readCount ? 'Ler o próximo' : 'Começar a ler';
}

import { AddToCollectionDialog } from '../collections/components.tsx';
import {
  contributorsByPerson,
  contributorsLine,
  PROVIDER_LABEL,
  STATUS_LABEL,
  STATUS_TONE,
} from './labels.ts';

export function SeriesPage() {
  const { seriesId } = useParams();
  const { data: series, error, refetch } = useSeries(seriesId);
  const { data: books } = useBooks(seriesId);
  const progress = useSeriesProgress(seriesId);

  if (error) {
    return (
      <ErrorState
        title="Não deu para abrir esta série."
        detail={error.message}
        onRetry={() => void refetch()}
        back={
          <Link to="/library" className={buttonClass('secondary')}>
            Ir para a biblioteca
          </Link>
        }
      />
    );
  }
  if (!series) return <SeriesSkeleton />;

  return <SeriesView series={series} books={books} progress={progress} />;
}

function SeriesView({
  series,
  books,
  progress,
}: {
  series: Series;
  books: Book[] | undefined;
  progress: Map<string, StoredProgress>;
}) {
  const navigate = useNavigate();
  const { view, size } = useLibraryUi();
  const cover = useThumbnailUrl(series.coverBookId);
  const [adding, setAdding] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const meta = series.metadata;

  const readCount = books?.filter((b) => progress.get(b.id)?.completed).length ?? 0;
  const allRead = !!books && readCount === books.length;
  const next =
    books?.find((b) => {
      const p = progress.get(b.id);
      return p && !p.completed;
    }) ?? books?.find((b) => !progress.get(b.id)?.completed);
  const nextProgress = next && progress.get(next.id);

  const openGenre = (g: string) => {
    const ui = useLibraryUi.getState();
    ui.clearFilters();
    ui.toggleGenre(g);
    navigate('/library');
  };

  return (
    <div>
      {/* Hero com a capa desfocada ao fundo */}
      <section className="-mx-4 -mt-6 sm:-mx-8 lg:-mt-10 relative isolate mb-10 overflow-hidden">
        {cover && (
          <img
            src={cover}
            alt=""
            className="-z-10 absolute inset-0 h-full w-full scale-125 object-cover opacity-30 blur-3xl"
          />
        )}
        <div className="-z-10 absolute inset-0 bg-gradient-to-b from-ink-900/40 via-ink-900/80 to-ink-900" />

        <div className="px-4 pt-6 pb-2 sm:px-8 lg:pt-10">
          <div className="mb-6 flex items-center gap-3 text-sm">
            <button
              type="button"
              onClick={() => (history.length > 1 ? navigate(-1) : navigate('/library'))}
              className="inline-flex min-h-9 items-center gap-1.5 text-ink-300 hover:text-white pointer-coarse:min-h-11"
            >
              <ArrowLeft className="size-4" /> Voltar
            </button>
            {series.shelf && (
              <>
                <span aria-hidden="true" className="text-ink-500">
                  /
                </span>
                <Link
                  to={`/library?estante=${encodeURIComponent(series.shelf)}`}
                  className="inline-flex min-h-9 items-center text-ink-300 hover:text-white pointer-coarse:min-h-11"
                >
                  Estante {series.shelf}
                </Link>
              </>
            )}
          </div>

          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:gap-8">
            <div className="w-36 shrink-0 sm:w-48">
              <Cover bookId={series.coverBookId} alt={series.name} />
            </div>
            <div className="min-w-0 flex-1 pb-1">
              <h1 className="font-display font-extrabold uppercase tracking-wide text-5xl leading-[0.92] sm:text-7xl">
                {series.name}
              </h1>
              {meta?.contributors && (
                <p className="mt-2 text-ink-200">{contributorsLine(meta.contributors)}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {meta?.year && <Badge>{meta.year}</Badge>}
                {meta?.status && (
                  <Badge tone={STATUS_TONE[meta.status]}>{STATUS_LABEL[meta.status]}</Badge>
                )}
                {meta?.ageRating && <Badge>{meta.ageRating}</Badge>}
                {series.rtl && <Badge>Leitura oriental</Badge>}
              </div>

              <div className="mt-6 flex flex-wrap items-center gap-2">
                {!next && books?.[0] && (
                  <Link to={`/read/${books[0].id}`} className={buttonClass('primary')}>
                    <RotateCcw className="size-4" aria-hidden="true" /> Ler de novo
                  </Link>
                )}
                {next && (
                  <Link to={`/read/${next.id}`} className={buttonClass('primary')}>
                    {primaryLabel(nextProgress, readCount)}
                    {next.title !== series.name && (
                      <span className="font-normal opacity-75">· {next.title}</span>
                    )}
                  </Link>
                )}
                <Button onClick={() => setAdding(true)}>
                  <Layers className="size-4" aria-hidden="true" /> Adicionar à coleção
                </Button>
                {books && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="sm:ml-2"
                    onClick={async () => {
                      const undo = await setSeriesCompleted(series.id, books, !allRead);
                      toast({
                        message: allRead
                          ? `${series.name} marcada como não lida`
                          : `${books.length} ${books.length === 1 ? 'livro marcado' : 'livros marcados'} como lido`,
                        action: { label: 'Desfazer', run: undo },
                      });
                    }}
                  >
                    {allRead ? (
                      <RotateCcw className="size-4" aria-hidden="true" />
                    ) : (
                      <CheckCheck className="size-4" aria-hidden="true" />
                    )}
                    {allRead ? 'Marcar como não lida' : 'Marcar tudo como lido'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sinopse e detalhes em fluxo: nada de coluna lateral alta abrindo um vão antes dos volumes. */}
      <div className="space-y-6">
        <div className="min-w-0 space-y-10">
          {meta?.summary && (
            <section>
              <p
                className={`max-w-[34rem] text-ink-100 leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}
              >
                {meta.summary}
              </p>
              {meta.summary.length > 220 && (
                <button
                  type="button"
                  onClick={() => setExpanded((e) => !e)}
                  className="mt-1 text-obi-300 text-sm hover:underline"
                >
                  {expanded ? 'Mostrar menos' : 'Mostrar mais'}
                </button>
              )}
              {meta.genres && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {meta.genres.map((g) => (
                    <Chip key={g} onClick={() => openGenre(g)}>
                      {g}
                    </Chip>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
        <DetailsPanel series={series} />
      </div>

      <section className="mt-12">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display font-extrabold text-3xl uppercase tracking-wide">
              {series.bookCount === 1 ? 'Livro' : 'Volumes'}
            </h2>
            {books && books.length > 1 && (
              <div className="mt-1.5 flex items-center gap-3 text-ink-300 text-sm">
                <div className="h-1.5 w-28 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full bg-gold-400"
                    style={{ width: `${(readCount / books.length) * 100}%` }}
                  />
                </div>
                {readCount}/{books.length} lidos
              </div>
            )}
          </div>
          {books && books.length > 1 && <ViewControls withList={false} />}
        </div>
        {view === 'side' && books && books.length > 1 ? (
          <SpineShelf size={size} label={`Volumes de ${series.name}`}>
            {books.map((book) => {
              const p = progress.get(book.id);
              const status = p?.completed ? 'read' : p && p.page > 0 ? 'reading' : 'unread';
              return (
                <Spine
                  key={book.id}
                  to={`/read/${book.id}`}
                  coverBookId={book.id}
                  turnId={book.id}
                  number={book.title.replace(/^(#|Vol\.\s*|Cap\.\s*)/, '')}
                  spineTitle={series.name}
                  label={book.format.toUpperCase()}
                  ariaLabel={
                    book.title === series.name ? series.name : `${series.name} ${book.title}`
                  }
                  detail={
                    p && !p.completed && p.pageCount
                      ? `pág. ${p.page + 1} de ${p.pageCount}`
                      : book.pageCount
                        ? `${book.pageCount} páginas`
                        : book.format.toUpperCase()
                  }
                  status={status}
                  progress={p?.pageCount ? (p.page + 1) / p.pageCount : undefined}
                  weight={book.pageCount ? book.pageCount / 24 : 1}
                  size={size}
                />
              );
            })}
          </SpineShelf>
        ) : (
          <div className={COVER_GRID_BY_SIZE[size]}>
            {books?.map((book) => (
              <BookCard key={book.id} book={book} progress={progress.get(book.id)} />
            ))}
          </div>
        )}
      </section>

      <AddToCollectionDialog open={adding} onClose={() => setAdding(false)} series={series} />
    </div>
  );
}

function DetailsPanel({ series }: { series: Series }) {
  const meta = series.metadata;
  const memberOf = useCollectionsOfSeries(series.id);
  const collections = useCollections()?.filter((c) => memberOf.has(c.id)) ?? [];
  const people = contributorsByPerson(meta?.contributors);

  const rows: [string, React.ReactNode][] = [];
  for (const p of people) rows.push([p.roles, p.name]);
  if (meta?.publisher) rows.push(['Editora', meta.publisher]);
  if (meta?.year) rows.push(['Ano', meta.year]);
  rows.push(['Leitura', series.rtl ? 'Direita → esquerda' : 'Esquerda → direita']);
  if (meta?.provider) rows.push(['Metadados', PROVIDER_LABEL[meta.provider]]);

  return (
    <aside
      aria-labelledby="series-details"
      className="flex flex-wrap items-center gap-x-10 gap-y-3 rounded-2xl border border-white/5 bg-white/[0.02] px-5 py-4"
    >
      <h2 id="series-details" className="sr-only">
        Detalhes
      </h2>
      <dl className="flex flex-wrap gap-x-10 gap-y-3 text-sm">
        {rows.map(([k, v]) => (
          <div key={`${k}-${String(v)}`}>
            <dt className="text-ink-300 text-xs">{k}</dt>
            <dd className="text-ink-100">{v}</dd>
          </div>
        ))}
      </dl>
      {collections.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {collections.map((c) => (
            <Link
              key={c.id}
              to={`/collections/${c.id}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-white/5 px-3 text-ink-100 text-xs hover:bg-white/10 pointer-coarse:h-11"
            >
              <Layers className="size-3.5 text-obi-300" /> {c.name}
            </Link>
          ))}
        </div>
      )}
      {meta?.tags && meta.tags.length > 0 && (
        <p className="flex flex-wrap gap-x-2 gap-y-1 text-ink-300 text-xs">
          {meta.tags.map((t) => (
            <span key={t}>#{t}</span>
          ))}
        </p>
      )}
    </aside>
  );
}

function BookCard({ book, progress }: { book: Book; progress: StoredProgress | undefined }) {
  const completed = progress?.completed ?? false;
  return (
    <div className="group space-y-2.5">
      <Link
        to={`/read/${book.id}`}
        className="block transition-transform duration-200 group-hover:-translate-y-1"
        style={{ viewTransitionName: turnName(book.id) }}
      >
        <Cover
          bookId={book.id}
          alt={book.title}
          progress={progress?.pageCount ? (progress.page + 1) / progress.pageCount : undefined}
          completed={completed}
        />
      </Link>
      <Ledge />
      <div className="flex items-start justify-between gap-2 px-0.5">
        <div className="min-w-0">
          <p className="truncate font-medium text-sm">{book.title}</p>
          <p className="text-ink-300 text-xs">
            {progress && !completed
              ? `Pág. ${progress.page + 1} de ${progress.pageCount}`
              : [book.pageCount ? `${book.pageCount} pág.` : '', book.format.toUpperCase()]
                  .filter(Boolean)
                  .join(' · ')}
          </p>
        </div>
        {/* Sempre visível (toque não tem hover); discreto até ser marcado. */}
        <button
          type="button"
          onClick={() => setCompleted(book, !completed)}
          aria-pressed={completed}
          aria-label={`${book.title} lido`}
          title={completed ? 'Lido · toque para desmarcar' : 'Marcar como lido'}
          className="-m-1 grid size-9 shrink-0 place-items-center rounded-full pointer-coarse:size-11"
        >
          <span
            className={`grid size-7 place-items-center rounded-full transition-colors ${
              completed
                ? 'bg-gold-400 text-ink-900'
                : 'text-ink-300 ring-1 ring-white/20 hover:text-white hover:ring-white/40'
            }`}
          >
            <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
          </span>
        </button>
      </div>
    </div>
  );
}

function SeriesSkeleton() {
  return (
    <div className="flex animate-pulse gap-8 pt-14">
      <div className="aspect-[2/3] w-48 rounded-lg bg-ink-850" />
      <div className="flex-1 space-y-4 pt-24">
        <div className="h-10 w-2/3 rounded bg-ink-850" />
        <div className="h-4 w-1/3 rounded bg-ink-850" />
      </div>
    </div>
  );
}

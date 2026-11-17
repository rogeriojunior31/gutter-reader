import type { Book, Series } from '@gutter/core';
import { ArrowLeft, Check, Flame } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link } from 'react-router';
import { SpineBand } from '../../components/Spine.tsx';
import { buttonClass } from '../../components/ui.tsx';
import { useActivity, useDailyGoal } from '../../db/activity.ts';
import { useThumbnailUrl } from '../../lib/queries.ts';

const volumeNumber = (b: Book) => b.title.replace(/^(#|Vol\.\s*|Cap\.\s*)/, '');

/**
 * O fim de um volume é o pico da leitura: a cinta do volume vira dourada, o dia
 * mostra o que rendeu (páginas, meta, sequência) e o próximo já sai da estante.
 */
export function EndOfBook({
  book,
  series,
  next,
  onStay,
}: {
  book: Book;
  series: Series;
  next: Book | undefined;
  onStay: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const activity = useActivity(7);
  const goal = useDailyGoal();
  const nextCover = useThumbnailUrl(next?.id);

  // Sem close() na limpeza: no StrictMode ele dispararia um `close` atrasado
  // que fecharia o painel logo após abrir (ver ShortcutsHelp no leitor).
  useEffect(() => {
    const el = ref.current;
    if (!el || el.open) return;
    el.showModal();
    el.querySelector<HTMLElement>('[data-autofocus]')?.focus();
  }, []);

  const finishedTitle = book.title === series.name ? series.name : book.title;
  const today = activity?.today ?? 0;
  const streak = activity?.streak.current ?? 0;
  const goalMet = today >= goal;

  return (
    <dialog
      ref={ref}
      aria-labelledby="end-of-book-title"
      onClose={onStay}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] animate-[gutter-rise_320ms_cubic-bezier(0.16,1,0.3,1)] rounded-3xl border border-white/10 bg-ink-850 p-6 text-ink-50 shadow-2xl shadow-black/70 backdrop:bg-black/80 motion-reduce:animate-none"
    >
      <p className="flex items-center gap-2 font-medium text-gold-300 text-sm">
        <Check className="size-4" strokeWidth={3} aria-hidden="true" /> Marcado como lido
      </p>
      <h2
        id="end-of-book-title"
        className="mt-2 pt-[0.1em] font-display font-extrabold text-4xl uppercase leading-none tracking-wide"
      >
        Fim de {finishedTitle}
      </h2>

      {/* Miniestante: o volume terminado (cinta dourada) e o próximo saindo dela. */}
      <div aria-hidden="true" className="mt-6">
        <div className="flex items-end gap-1.5 px-2">
          <SpineBand
            coverBookId={book.id}
            number={volumeNumber(book)}
            spineTitle={series.name}
            label={book.format.toUpperCase()}
            status="read"
            size="sm"
            className="h-40 w-11"
          />
          {next && (
            <>
              <SpineBand
                coverBookId={next.id}
                number={volumeNumber(next)}
                spineTitle={series.name}
                label={next.format.toUpperCase()}
                status="unread"
                size="sm"
                className="h-40 w-11 opacity-70"
              />
              <span className="block w-24 -translate-y-2 animate-[gutter-rise_420ms_120ms_cubic-bezier(0.16,1,0.3,1)_backwards] motion-reduce:animate-none">
                {nextCover ? (
                  <img
                    src={nextCover}
                    alt=""
                    className="aspect-[2/3] w-full rounded-md object-cover shadow-2xl shadow-black/60 ring-1 ring-white/10"
                  />
                ) : (
                  <span className="block aspect-[2/3] rounded-md bg-ink-800" />
                )}
              </span>
            </>
          )}
        </div>
        <div className="h-2.5 bg-ink-700 shadow-[0_8px_14px_-8px_rgb(0_0_0/0.7)]" />
      </div>

      {/* O que o dia rendeu */}
      <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-ink-800 px-2 py-3">
          <dt className="text-ink-300 text-xs">Hoje</dt>
          <dd className="font-display font-extrabold text-2xl tabular-nums">{today} pág.</dd>
        </div>
        <div
          className={`rounded-xl px-2 py-3 ${goalMet ? 'bg-gold-400 text-ink-900' : 'bg-ink-800'}`}
        >
          <dt className={`text-xs ${goalMet ? 'text-ink-900/80' : 'text-ink-300'}`}>
            {goalMet ? 'Meta batida' : 'Meta'}
          </dt>
          <dd className="font-display font-extrabold text-2xl tabular-nums">
            {today}/{goal}
          </dd>
        </div>
        <div className="rounded-xl bg-ink-800 px-2 py-3">
          <dt className="flex items-center justify-center gap-1 text-ink-300 text-xs">
            <Flame className="size-3 text-gold-400" aria-hidden="true" /> Sequência
          </dt>
          <dd className="font-display font-extrabold text-2xl tabular-nums">
            {streak} {streak === 1 ? 'dia' : 'dias'}
          </dd>
        </div>
      </dl>

      {next ? (
        <p className="mt-5 text-ink-200 text-sm">
          A seguir em {series.name}: <span className="font-semibold text-ink-50">{next.title}</span>
          {next.pageCount > 0 ? ` · ${next.pageCount} páginas` : ''}
        </p>
      ) : (
        <p className="mt-5 text-ink-200 text-sm">
          Você terminou {series.bookCount > 1 ? `todos os volumes de ${series.name}` : 'a série'}.
        </p>
      )}

      <div className="mt-5 flex flex-col gap-2">
        {next ? (
          <Link
            to={`/read/${next.id}`}
            replace
            data-autofocus
            className={buttonClass('primary', 'md', 'w-full')}
          >
            Ler {next.title}
          </Link>
        ) : (
          <Link
            to={`/series/${series.id}`}
            replace
            data-autofocus
            className={buttonClass('primary', 'md', 'w-full')}
          >
            Voltar à série
          </Link>
        )}
        {next && (
          <Link
            to={`/series/${series.id}`}
            replace
            className={buttonClass('secondary', 'md', 'w-full')}
          >
            <ArrowLeft className="size-4" aria-hidden="true" /> Voltar à série
          </Link>
        )}
        <button type="button" onClick={onStay} className={buttonClass('ghost', 'md', 'w-full')}>
          Continuar nesta página
        </button>
      </div>
    </dialog>
  );
}

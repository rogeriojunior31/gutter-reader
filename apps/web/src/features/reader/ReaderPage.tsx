import type { Book, ReaderSettings } from '@gutter/core';
import { Reader } from '@gutter/reader';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { buttonClass, ErrorState } from '../../components/ui.tsx';
import { logPages } from '../../db/activity.ts';
import { saveSeriesSettings, useReaderSettings } from '../../db/prefs.ts';
import { saveProgress, useProgress } from '../../db/progress.ts';
import { useBook, useBooks, usePages, useSeries } from '../../lib/queries.ts';
import { useSource } from '../../sources/source-context.tsx';
import { EndOfBook } from './EndOfBook.tsx';

const SAVE_DEBOUNCE_MS = 400;

/** Remonta o leitor ao trocar de livro (zera estado local como overrides de config). */
export function ReaderRoute() {
  const { bookId } = useParams();
  return <ReaderPage key={bookId} />;
}

export function ReaderPage() {
  const { bookId } = useParams();
  const source = useSource();
  const navigate = useNavigate();
  const { data: book, error: bookError, refetch: refetchBook } = useBook(bookId);
  const { data: pages, error: pagesError, refetch: refetchPages } = usePages(bookId);
  const { data: series } = useSeries(book?.seriesId);
  const { data: siblings } = useBooks(book?.seriesId);
  const progress = useProgress(bookId);
  const resolved = useReaderSettings(series, pages ?? []);
  // Override otimista: a UI responde na hora, o Dexie alcança depois.
  const [override, setOverride] = useState<ReaderSettings>();
  const settings = override ?? resolved;

  const [prevBook, nextBook] = useMemo(() => {
    if (!book || !siblings) return [undefined, undefined];
    const i = siblings.findIndex((b) => b.id === book.id);
    return [i > 0 ? siblings[i - 1] : undefined, siblings[i + 1]];
  }, [book, siblings]);

  const [ended, setEnded] = useState(false);
  const [tapHint, dismissTapHint] = useOnceFlag('gutter.tap-hint-seen');
  const [guidedHint, dismissGuidedHint] = useOnceFlag('gutter.guided-hint-seen');

  useWakeLock();
  const saveProgressDebounced = useDebouncedProgress(book, pages?.length ?? 0);
  const reading = useReadingLogger(book, series?.name);
  const onPageChange = (page: number) => {
    saveProgressDebounced(page);
    reading.log(page);
  };

  const error = bookError ?? pagesError;
  if (error) {
    return (
      <div className="grid h-dvh place-items-center bg-ink-900 p-4">
        <ErrorState
          title="Não deu para abrir este livro."
          detail={error.message}
          onRetry={() => {
            void refetchBook();
            void refetchPages();
          }}
          back={
            <Link to={book ? `/series/${book.seriesId}` : '/library'} className={buttonClass()}>
              {book ? 'Voltar à série' : 'Ir para a biblioteca'}
            </Link>
          }
        />
      </div>
    );
  }
  // Espera o progresso salvo: o Reader só lê `initialPage` ao montar.
  if (!book || !pages || !settings || !series || progress === undefined) {
    return (
      <div className="grid h-dvh place-items-center bg-black">
        <span className="sr-only" role="status">
          Abrindo livro…
        </span>
        <span className="size-6 animate-spin rounded-full border-2 border-ink-800 border-t-ink-200 motion-reduce:animate-none" />
      </div>
    );
  }

  return (
    <div className="h-dvh">
      <Reader
        key={book.id}
        source={source}
        bookId={book.id}
        pages={pages}
        settings={settings}
        onSettingsChange={(s) => {
          setOverride(s);
          void saveSeriesSettings(series.id, s);
        }}
        initialPage={progress && !progress.completed ? progress.page : 0}
        title={book.title === series.name ? series.name : `${series.name} — ${book.title}`}
        subtitle={`${book.format.toUpperCase()} · ${pages.length} páginas`}
        onPageChange={onPageChange}
        onEnd={() => {
          reading.flush(); // o painel de fim mostra o dia já com estas páginas
          setEnded(true);
        }}
        onClose={() => navigate(`/series/${series.id}`)}
        {...(prevBook && {
          onPrevBook: () => navigate(`/read/${prevBook.id}`, { replace: true }),
        })}
        {...(nextBook && {
          onNextBook: () => navigate(`/read/${nextBook.id}`, { replace: true }),
        })}
        paused={ended}
        showTapHint={tapHint}
        onTapHintDismiss={dismissTapHint}
        showGuidedHint={guidedHint}
        onGuidedHintDismiss={dismissGuidedHint}
      />
      {ended && (
        <EndOfBook book={book} series={series} next={nextBook} onStay={() => setEnded(false)} />
      )}
    </div>
  );
}

/** Avanço máximo entre duas páginas que ainda conta como leitura (página dupla = 2). */
const MAX_READ_STEP = 2;
const LOG_FLUSH_MS = 2000;

/**
 * Conta páginas realmente lidas para a aba Leituras: só avanços de uma vista por vez.
 * Pular pelo slider ou pela tecla End não vira "leitura".
 */
function useReadingLogger(book: Book | undefined, seriesName: string | undefined) {
  const furthest = useRef<number | undefined>(undefined);
  const pending = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef({ book, seriesName });
  latest.current = { book, seriesName };

  const flush = useCallback(() => {
    clearTimeout(timer.current);
    const { book: b, seriesName: s } = latest.current;
    if (!b || pending.current === 0) return;
    void logPages(b, s ?? '', pending.current);
    pending.current = 0;
  }, []);

  useEffect(() => flush, [flush]);

  const log = (page: number) => {
    const prev = furthest.current;
    if (prev === undefined || page <= prev) {
      furthest.current = Math.max(prev ?? page, page); // primeira página ou voltando: só marca
      return;
    }
    const step = page - prev;
    furthest.current = page;
    if (step > MAX_READ_STEP) return;
    pending.current += step;
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, LOG_FLUSH_MS);
  };
  return { log, flush };
}

/** Flag "já vi" por navegador. Sem storage (aba privada etc.), mostra uma vez por sessão. */
function useOnceFlag(key: string): [boolean, () => void] {
  const [show, setShow] = useState(() => {
    try {
      return localStorage.getItem(key) !== '1';
    } catch {
      return true;
    }
  });
  return [
    show,
    () => {
      setShow(false);
      try {
        localStorage.setItem(key, '1');
      } catch {
        // sem persistência: tudo bem
      }
    },
  ];
}

function useDebouncedProgress(book: Book | undefined, pageCount: number) {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pending = useRef<() => void>(undefined);

  useEffect(
    () => () => {
      clearTimeout(timer.current);
      pending.current?.(); // grava a última página ao sair
    },
    [],
  );

  return (page: number) => {
    if (!book || pageCount === 0) return;
    const save = () => {
      pending.current = undefined;
      void saveProgress({
        bookId: book.id,
        seriesId: book.seriesId,
        pageCount,
        page,
      });
    };
    pending.current = save;
    clearTimeout(timer.current);
    timer.current = setTimeout(save, SAVE_DEBOUNCE_MS);
  };
}

/** Mantém a tela acesa durante a leitura (onde suportado). */
function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | undefined;
    let cancelled = false;
    const acquire = async () => {
      if (!('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
      try {
        lock = await navigator.wakeLock.request('screen');
        if (cancelled) void lock.release();
      } catch {
        // negado (bateria fraca, iframe etc.): sem problema
      }
    };
    void acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', acquire);
      void lock?.release();
    };
  }, []);
}

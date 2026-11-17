import type { PageInfo, PageSource, ReaderSettings } from '@gutter/core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PagedView } from './PagedView.tsx';
import { windowAround } from './page-cache.ts';
import { ReaderChrome } from './ReaderChrome.tsx';
import { ShortcutsHelp } from './ShortcutsHelp.tsx';
import { buildViews, viewIndexByPage } from './spreads.ts';
import { TapHint } from './TapHint.tsx';
import { useMediaQuery } from './use-media-query.ts';
import { usePageCache } from './use-page-cache.ts';
import { type WebtoonHandle, WebtoonView } from './WebtoonView.tsx';

export interface ReaderProps {
  source: PageSource;
  bookId: string;
  pages: readonly PageInfo[];
  settings: ReaderSettings;
  onSettingsChange: (settings: ReaderSettings) => void;
  initialPage?: number;
  title?: string;
  subtitle?: string;
  /** Chamado com a primeira página visível sempre que ela muda. */
  onPageChange?: (page: number) => void;
  /** Usuário tentou avançar além da última página. */
  onEnd?: () => void;
  onClose?: () => void;
  /** Volume anterior/próximo da série (teclas [ e ]); ausente = não há. */
  onPrevBook?: () => void;
  onNextBook?: () => void;
  /** Suspende teclado e toques (ex.: um painel de fim de livro por cima). */
  paused?: boolean;
  /** Mostra a dica das zonas de toque (o app decide se é a primeira vez). */
  showTapHint?: boolean;
  onTapHintDismiss?: () => void;
}

/** Janela de preload: vistas ±2 no paginado, páginas ±5 no webtoon. */
const PAGED_RADIUS = 2;
const WEBTOON_RADIUS = 5;
/** Celular em pé: duas páginas lado a lado ficam ilegíveis. */
const NARROW_PORTRAIT = '(max-width: 640px) and (orientation: portrait)';

/**
 * Reader puro: não faz I/O além de pedir páginas para a `source`.
 * Estado de configuração é controlado por quem usa (para persistir por série).
 */
export function Reader(props: ReaderProps) {
  const { source, bookId, pages, onSettingsChange } = props;
  const count = pages.length;
  const narrow = useMediaQuery(NARROW_PORTRAIT);
  // A preferência salva continua "double"; só a exibição cai para "single".
  const settings: ReaderSettings =
    narrow && props.settings.layout === 'double'
      ? { ...props.settings, layout: 'single' }
      : props.settings;

  const [page, setPage] = useState(() => clamp(props.initialPage ?? 0, count));
  const [chromeVisible, setChromeVisible] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [helpOpen, setHelpOpenState] = useState(false);
  const helpOpenRef = useRef(false);
  const setHelpOpen = useCallback((open: boolean) => {
    helpOpenRef.current = open;
    setHelpOpenState(open);
  }, []);
  const webtoonRef = useRef<WebtoonHandle>(null);
  const webtoon = settings.layout === 'webtoon';
  const hint = !!props.showTapHint && !webtoon && count > 0;

  const views = useMemo(
    () => buildViews(pages, settings.layout, settings.coverAlone),
    [pages, settings.layout, settings.coverAlone],
  );
  const viewOf = useMemo(() => viewIndexByPage(views, count), [views, count]);
  const viewIndex = viewOf[page] ?? 0;
  const view = views[viewIndex] ?? [];

  const windowIndices = useMemo(
    () =>
      webtoon
        ? windowAround(page, WEBTOON_RADIUS, count)
        : views.slice(Math.max(0, viewIndex - PAGED_RADIUS), viewIndex + PAGED_RADIUS + 1).flat(),
    [webtoon, page, count, views, viewIndex],
  );
  const cache = usePageCache(source, bookId, windowIndices);

  const latest = useRef(props);
  latest.current = props;
  useEffect(() => {
    latest.current.onPageChange?.(page);
  }, [page]);

  /** Avança/volta uma vista na ordem de leitura. */
  const step = useCallback(
    (delta: 1 | -1) => {
      if (webtoon) {
        webtoonRef.current?.scrollByViewport(delta * 0.8);
        return;
      }
      const target = views[viewIndex + delta];
      if (target?.[0] !== undefined) setPage(target[0]);
      else if (delta === 1) latest.current.onEnd?.();
    },
    [webtoon, views, viewIndex],
  );

  const seek = useCallback(
    (p: number) => {
      const target = clamp(p, count);
      setPage(webtoon ? target : (views[viewOf[target] ?? 0]?.[0] ?? target));
    },
    [count, webtoon, views, viewOf],
  );

  // Teclado
  useEffect(() => {
    const rtl = settings.direction === 'rtl' && !webtoon;
    const onKey = (e: KeyboardEvent) => {
      // Um modal por cima (ajuda, fim de livro) cuida do próprio teclado.
      // Lido de refs, atualizados na hora: uma tecla logo após fechar não se perde.
      if (helpOpenRef.current || latest.current.paused) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target instanceof HTMLElement ? e.target : null;
      if (target?.closest('input, select, textarea')) return;
      // Espaço/Enter num botão focado devem acionar o botão, não virar a página.
      if ((e.key === ' ' || e.key === 'Enter') && target?.closest('button, a')) return;
      if (hint) latest.current.onTapHintDismiss?.();
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      let handled = true;
      switch (key) {
        case 'ArrowRight':
        case 'd':
          step(rtl ? -1 : 1);
          break;
        case 'ArrowLeft':
        case 'a':
          step(rtl ? 1 : -1);
          break;
        case ' ':
          step(e.shiftKey ? -1 : 1);
          break;
        case 'PageDown':
          step(1);
          break;
        case 'PageUp':
          step(-1);
          break;
        case 'Home':
          seek(0);
          break;
        case 'End':
          seek(count - 1);
          break;
        case 'm':
          setChromeVisible((v) => !v);
          break;
        case '[':
          if (latest.current.onPrevBook) latest.current.onPrevBook();
          else handled = false;
          break;
        case ']':
          if (latest.current.onNextBook) latest.current.onNextBook();
          else handled = false;
          break;
        case 'f':
          toggleFullscreen();
          break;
        case '?':
          setHelpOpen(true);
          break;
        case 'Escape':
          if (panelOpen) setPanelOpen(false);
          else if (!document.fullscreenElement) latest.current.onClose?.();
          break;
        default:
          handled = false;
      }
      if (handled) e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hint, settings.direction, webtoon, step, seek, count, panelOpen, setHelpOpen]);

  const onTap = (zone: 'left' | 'center' | 'right') => {
    if (props.paused) return;
    if (panelOpen) return setPanelOpen(false);
    if (zone === 'center') return setChromeVisible((v) => !v);
    const forward = zone === 'right' ? settings.direction === 'ltr' : settings.direction === 'rtl';
    step(forward ? 1 : -1);
  };

  const first = webtoon ? page : (view[0] ?? page);
  const last = webtoon ? page : (view.at(-1) ?? page);
  const pageLabel = first === last ? `${first + 1}` : `${first + 1}–${last + 1}`;

  return (
    <div className="relative h-full w-full overflow-hidden bg-black text-white">
      {count === 0 ? (
        <div className="grid h-full place-items-center text-ink-300">
          Este livro não tem páginas de imagem.
        </div>
      ) : webtoon ? (
        <WebtoonView
          pages={pages}
          page={page}
          cache={cache}
          handle={webtoonRef}
          onPageChange={setPage}
          onTap={() => onTap('center')}
        />
      ) : (
        <PagedView
          pages={pages}
          view={view}
          fit={settings.fit}
          direction={settings.direction}
          cache={cache}
          onTap={onTap}
        />
      )}
      <ReaderChrome
        visible={chromeVisible && !hint}
        title={props.title}
        subtitle={props.subtitle}
        page={page}
        pageCount={count}
        pageLabel={pageLabel}
        settings={settings}
        doubleAvailable={!narrow}
        panelOpen={panelOpen}
        onPanelToggle={() => setPanelOpen((o) => !o)}
        onSettingsChange={(s) => {
          // Em tela estreita o layout exibido pode diferir do salvo; preserva o salvo.
          onSettingsChange(
            narrow && s.layout === 'single' && props.settings.layout === 'double'
              ? { ...s, layout: 'double' }
              : s,
          );
        }}
        onSeek={seek}
        onClose={props.onClose}
        onHelp={() => setHelpOpen(true)}
        onFullscreen={document.fullscreenEnabled ? toggleFullscreen : undefined}
      />
      {hint && (
        <TapHint
          direction={settings.direction}
          onDismiss={() => latest.current.onTapHintDismiss?.()}
        />
      )}
      {helpOpen && (
        <ShortcutsHelp
          rtl={settings.direction === 'rtl' && !webtoon}
          onClose={() => setHelpOpen(false)}
        />
      )}
    </div>
  );
}

function toggleFullscreen() {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen?.().catch(() => {});
}

function clamp(page: number, count: number): number {
  return Math.min(Math.max(0, Math.floor(page)), Math.max(0, count - 1));
}

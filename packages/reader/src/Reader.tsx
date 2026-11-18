import type { PageInfo, PageSource, ReaderSettings } from '@gutter/core';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { analyzeImage, type PageAnalysis } from './balloons.ts';
import { GuidedLayer } from './GuidedLayer.tsx';
import { type Camera, type GuidedStop, type Lens, lensFor, panFor } from './guided.ts';
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
  /** Destaca o botão da leitura guiada até a pessoa conhecer o recurso. */
  showGuidedHint?: boolean;
  onGuidedHintDismiss?: () => void;
}

/** Janela de preload: vistas ±2 no paginado, páginas ±5 no webtoon. */
const PAGED_RADIUS = 2;
const WEBTOON_RADIUS = 5;
/** Celular em pé: duas páginas lado a lado ficam ilegíveis. */
const NARROW_PORTRAIT = '(max-width: 640px) and (orientation: portrait)';
/** Espaço reservado à barra da leitura guiada no pé da tela. */
const GUIDED_BAR = 76;

interface GuidedState {
  stops: GuidedStop[];
  index: number;
  /** Brilho médio de cada página (escurecimento mais leve em páginas claras). */
  brightness: Record<number, number>;
}

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
  const scrollerRef = useRef<HTMLDivElement>(null);
  const webtoon = settings.layout === 'webtoon';
  const rtl = settings.direction === 'rtl' && !webtoon;
  const hint = !!props.showTapHint && !webtoon && count > 0;

  // Leitura guiada: ligada/desligada, as paradas da vista atual e a câmera.
  const [guidedOn, setGuidedOnState] = useState(false);
  const guidedOnRef = useRef(false);
  const setGuidedOn = useCallback((on: boolean) => {
    guidedOnRef.current = on;
    setGuidedOnState(on);
  }, []);
  const [guided, setGuided] = useState<GuidedState | null>(null);
  const [camera, setCamera] = useState<Camera | null>(null);
  const [lens, setLens] = useState<{ lens: Lens | null; url: string | null }>({
    lens: null,
    url: null,
  });
  const [resizeTick, setResizeTick] = useState(0);
  /** Ao virar a página pela leitura guiada, começa no primeiro ou no último balão. */
  const enterAt = useRef<'first' | 'last'>('first');
  /** Análises já feitas, por imagem e direção (custa alguns ms por página). */
  const analyses = useRef(new Map<string, PageAnalysis | null>());

  const views = useMemo(
    () => buildViews(pages, settings.layout, settings.coverAlone),
    [pages, settings.layout, settings.coverAlone],
  );
  const viewOf = useMemo(() => viewIndexByPage(views, count), [views, count]);
  const viewIndex = viewOf[page] ?? 0;
  const view = views[viewIndex] ?? [];
  const viewKey = view.join('-');

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
      else if (delta === 1) {
        setGuidedOn(false);
        latest.current.onEnd?.();
      }
    },
    [webtoon, views, viewIndex, setGuidedOn],
  );

  const seek = useCallback(
    (p: number) => {
      const target = clamp(p, count);
      setPage(webtoon ? target : (views[viewOf[target] ?? 0]?.[0] ?? target));
    },
    [count, webtoon, views, viewOf],
  );

  const enterGuided = useCallback(() => {
    if (webtoon || count === 0) return;
    enterAt.current = 'first';
    setPanelOpen(false);
    setGuidedOn(true);
    latest.current.onGuidedHintDismiss?.();
    if (hint) latest.current.onTapHintDismiss?.();
  }, [webtoon, count, hint, setGuidedOn]);

  const exitGuided = useCallback(() => {
    setGuidedOn(false);
    // O foco volta ao botão que liga o modo (quem usa teclado não se perde).
    window.setTimeout(() => {
      document
        .querySelector<HTMLElement>('[aria-keyshortcuts="B"]')
        ?.focus({ preventScroll: true });
    }, 0);
  }, [setGuidedOn]);

  /** Próximo/anterior balão; nas pontas, vira a página e continua do outro lado. */
  const guidedStep = useCallback(
    (delta: 1 | -1) => {
      if (!guided) return;
      const next = guided.index + delta;
      if (next >= 0 && next < guided.stops.length) {
        setGuided({ ...guided, index: next });
        return;
      }
      enterAt.current = delta === 1 ? 'first' : 'last';
      step(delta);
    },
    [guided, step],
  );

  // Paradas da vista atual: espera as imagens carregarem e analisa cada página.
  // biome-ignore lint/correctness/useExhaustiveDependencies: refaz por vista (viewKey), direção e ajuste
  useEffect(() => {
    if (!guidedOn || webtoon) {
      setGuided(null);
      return;
    }
    setGuided(null);
    let cancelled = false;
    let tries = 0;
    let timer = 0;
    const attempt = () => {
      if (cancelled) return;
      const el = scrollerRef.current;
      const imgs = view.map((i) => el?.querySelector<HTMLImageElement>(`img[data-page="${i}"]`));
      const ready = imgs.every((img) => img?.complete && img.naturalWidth > 0);
      if (!ready && tries++ < 100) {
        timer = window.setTimeout(attempt, 60);
        return;
      }
      const stops: GuidedStop[] = [];
      const brightness: Record<number, number> = {};
      imgs.forEach((img, k) => {
        const pageIndex = view[k];
        if (!img || pageIndex === undefined) return;
        const key = `${img.currentSrc || img.src}|${rtl}`;
        let analysis = analyses.current.get(key);
        if (analysis === undefined) {
          analysis = analyzeImage(img, rtl);
          if (analyses.current.size >= 8) {
            const oldest = analyses.current.keys().next().value;
            if (oldest !== undefined) analyses.current.delete(oldest);
          }
          analyses.current.set(key, analysis);
        }
        if (analysis) brightness[pageIndex] = analysis.brightness;
        for (const rect of analysis?.stops ?? []) stops.push({ page: pageIndex, rect });
      });
      // Página sem texto (splash, página de ação): uma parada com a página inteira.
      if (!stops.length && view[0] !== undefined) stops.push({ page: view[0], rect: null });
      setGuided({ stops, index: enterAt.current === 'last' ? stops.length - 1 : 0, brightness });
      enterAt.current = 'first';
    };
    // Um quadro de respiro: a página nova aparece inteira antes da câmera entrar.
    timer = window.setTimeout(attempt, 140);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [guidedOn, webtoon, viewKey, rtl, settings.fit]);

  // A página fica parada (só desliza se o balão estiver fora da tela) e a lupa
  // traz o balão para perto, por cima do próprio lugar.
  // biome-ignore lint/correctness/useExhaustiveDependencies: resizeTick força nova medida
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    const stop = guided?.stops[guided.index];
    if (!guidedOn || !el || !stop) {
      setCamera(null);
      setLens({ lens: null, url: null });
      return;
    }
    const inner = el.firstElementChild as HTMLElement | null;
    const img = el.querySelector<HTMLImageElement>(`img[data-page="${stop.page}"]`);
    if (!inner || !img) return;
    const box = {
      left: inner.offsetLeft + img.offsetLeft,
      top: inner.offsetTop + img.offsetTop,
      width: img.offsetWidth,
      height: img.offsetHeight,
      naturalWidth: img.naturalWidth,
    };
    // Celular deitado: a barra é mais baixa e reserva menos espaço.
    const bar = el.clientHeight < 500 ? 52 : GUIDED_BAR;
    const vp = { width: el.clientWidth, height: Math.max(120, el.clientHeight - bar) };
    const cam = panFor(stop, box, vp);
    setCamera(cam);
    setLens({
      lens: lensFor(stop, box, cam, vp, settings.guidedZoom ?? 'medium'),
      url: img.currentSrc || img.src,
    });
  }, [guidedOn, guided, resizeTick, settings.guidedZoom]);

  useEffect(() => {
    if (!guidedOn) return;
    const onResize = () => setResizeTick((t) => t + 1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [guidedOn]);

  const guidedStepRef = useRef(guidedStep);
  guidedStepRef.current = guidedStep;

  // Teclado
  useEffect(() => {
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

      if (guidedOnRef.current) {
        let handled = true;
        const go = guidedStepRef.current;
        switch (key) {
          case 'ArrowRight':
          case 'd':
            go(rtl ? -1 : 1);
            break;
          case 'ArrowLeft':
          case 'a':
            go(rtl ? 1 : -1);
            break;
          case ' ':
            go(e.shiftKey ? -1 : 1);
            break;
          case 'PageDown':
          case 'Enter':
            go(1);
            break;
          case 'PageUp':
            go(-1);
            break;
          case 'Escape':
          case 'b':
            exitGuided();
            break;
          default:
            handled = false;
        }
        if (handled) e.preventDefault();
        return;
      }

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
        case 'b':
          enterGuided();
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
  }, [hint, rtl, step, seek, count, panelOpen, setHelpOpen, enterGuided, exitGuided]);

  const onTap = (zone: 'left' | 'center' | 'right') => {
    if (props.paused) return;
    if (panelOpen) return setPanelOpen(false);
    const forward = zone === 'right' ? !rtl : zone === 'left' ? rtl : true;
    if (guidedOnRef.current) {
      // Na leitura guiada qualquer toque segue a história; só o lado de "voltar" volta.
      guidedStep(forward ? 1 : -1);
      return;
    }
    if (zone === 'center') return setChromeVisible((v) => !v);
    step(forward ? 1 : -1);
  };

  const first = webtoon ? page : (view[0] ?? page);
  const last = webtoon ? page : (view.at(-1) ?? page);
  const pageLabel = first === last ? `${first + 1}` : `${first + 1}–${last + 1}`;
  const stop = guided?.stops[guided.index];
  const pageOf = stop ? ` · pág. ${stop.page + 1}` : '';
  const guidedStatus = !guided
    ? 'Procurando balões…'
    : stop && !stop.rect
      ? `Página sem balões${pageOf}`
      : `Balão ${guided.index + 1} de ${guided.stops.length}${pageOf}`;
  const pageBrightness = stop ? (guided?.brightness[stop.page] ?? 128) : 128;

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
          scrollerRef={scrollerRef}
          camera={camera}
          guided={guidedOn}
        />
      )}
      <ReaderChrome
        visible={chromeVisible && !hint && !guidedOn}
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
        onGuided={webtoon ? undefined : enterGuided}
        guidedHint={!!props.showGuidedHint && !webtoon && !hint}
        onGuidedHintDismiss={() => latest.current.onGuidedHintDismiss?.()}
      />
      {guidedOn && (
        <GuidedLayer
          lens={lens.lens}
          url={lens.url}
          // Página clara (fundo branco) escurece menos: a cena continua viva.
          dim={pageBrightness > 170 ? 0.22 : 0.32}
          status={guidedStatus}
          direction={settings.direction}
          onPrev={() => guidedStep(-1)}
          onNext={() => guidedStep(1)}
          onExit={exitGuided}
        />
      )}
      {hint && (
        <TapHint
          direction={settings.direction}
          onDismiss={() => latest.current.onTapHintDismiss?.()}
        />
      )}
      {helpOpen && <ShortcutsHelp rtl={rtl} onClose={() => setHelpOpen(false)} />}
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

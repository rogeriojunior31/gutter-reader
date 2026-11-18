import type {
  FitMode,
  GuidedZoom,
  ReaderLayout,
  ReaderSettings,
  ReadingDirection,
} from '@gutter/core';
import { type ReactNode, useState } from 'react';

interface Props {
  visible: boolean;
  title?: string | undefined;
  subtitle?: string | undefined;
  page: number;
  pageCount: number;
  /** Páginas visíveis na vista atual (ex.: "12–13"). */
  pageLabel: string;
  settings: ReaderSettings;
  /** Falso em celular em pé: página dupla não é oferecida. */
  doubleAvailable: boolean;
  panelOpen: boolean;
  onPanelToggle: () => void;
  onSettingsChange: (s: ReaderSettings) => void;
  onSeek: (page: number) => void;
  onClose?: (() => void) | undefined;
  onHelp: () => void;
  /** Ausente quando o navegador não tem Fullscreen API (ex.: iPhone). */
  onFullscreen?: (() => void) | undefined;
  /** Liga a leitura guiada; ausente no webtoon. */
  onGuided?: (() => void) | undefined;
  /** Destaca o botão até a pessoa conhecer o recurso. */
  guidedHint?: boolean;
  onGuidedHintDismiss?: () => void;
}

/** Rótulos compartilhados com a tela de Ajustes. */
export const LAYOUT_OPTIONS: [ReaderLayout, string][] = [
  ['single', 'Única'],
  ['double', 'Dupla'],
  ['webtoon', 'Webtoon'],
];
export const DIRECTION_OPTIONS: [ReadingDirection, string][] = [
  ['ltr', 'Esq → Dir'],
  ['rtl', 'Dir → Esq'],
];
export const GUIDED_ZOOM_OPTIONS: [GuidedZoom, string][] = [
  ['soft', 'Leve'],
  ['medium', 'Média'],
  ['strong', 'Forte'],
];
export const FIT_OPTIONS: [FitMode, string][] = [
  ['screen', 'Tela'],
  ['width', 'Largura'],
  ['height', 'Altura'],
  ['original', 'Original'],
];

const FOCUS =
  'focus-visible:outline-2 focus-visible:outline-gold-400 focus-visible:outline-offset-2';

export function ReaderChrome(props: Props) {
  const { visible, settings, onSettingsChange } = props;
  const set = (patch: Partial<ReaderSettings>) => onSettingsChange({ ...settings, ...patch });
  const webtoon = settings.layout === 'webtoon';
  // As faixas em degradê deixam o toque passar para a página (balões no topo
  // e no pé da página); só os controles de verdade recebem cliques.
  const headerPass = visible
    ? 'opacity-100 pointer-events-none [&_button]:pointer-events-auto'
    : 'pointer-events-none opacity-0';
  const footerPass = visible
    ? 'opacity-100 pointer-events-none [&>div]:pointer-events-auto'
    : 'pointer-events-none opacity-0';
  const layouts = props.doubleAvailable
    ? LAYOUT_OPTIONS
    : LAYOUT_OPTIONS.filter(([v]) => v !== 'double');

  return (
    <>
      <header
        inert={!visible}
        className={`absolute inset-x-0 top-0 z-20 flex items-center gap-2 bg-gradient-to-b from-ink-950/95 to-transparent px-2 pt-[max(env(safe-area-inset-top),0.5rem)] pb-8 transition-opacity duration-200 ${headerPass}`}
      >
        {props.onClose && (
          <IconButton label="Voltar à série" onClick={props.onClose}>
            <path d="M15 18l-6-6 6-6" />
          </IconButton>
        )}
        <div className="min-w-0 flex-1 px-1">
          <h1 className="truncate font-medium text-sm text-white">{props.title}</h1>
          {props.subtitle && <p className="truncate text-ink-200 text-xs">{props.subtitle}</p>}
        </div>
        {props.onFullscreen && (
          <IconButton label="Tela cheia (F)" onClick={props.onFullscreen}>
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </IconButton>
        )}
      </header>

      {props.panelOpen && visible && (
        <section
          aria-label="Configurações de leitura"
          className="absolute right-3 bottom-[calc(max(env(safe-area-inset-bottom),0.5rem)+4.5rem)] z-30 w-[min(20rem,calc(100vw-1.5rem))] space-y-4 rounded-2xl border border-white/10 bg-ink-850/95 p-4 shadow-2xl shadow-black/50 backdrop-blur"
        >
          <Segmented
            label="Layout"
            options={layouts}
            value={settings.layout}
            onChange={(layout) => set({ layout })}
          />
          {webtoon ? (
            <p className="text-ink-200 text-xs">
              Webtoon rola na vertical e sempre ocupa a largura da coluna.
            </p>
          ) : (
            <>
              <Segmented
                label="Direção"
                options={DIRECTION_OPTIONS}
                value={settings.direction}
                onChange={(direction) => set({ direction })}
              />
              <Segmented
                label="Ajuste"
                options={FIT_OPTIONS}
                value={settings.fit}
                onChange={(fit) => set({ fit })}
              />
            </>
          )}
          {!webtoon && (
            <Segmented
              label="Leitura guiada: aproximação do balão"
              options={GUIDED_ZOOM_OPTIONS}
              value={settings.guidedZoom ?? 'medium'}
              onChange={(guidedZoom) => set({ guidedZoom })}
            />
          )}
          {settings.layout === 'double' && (
            <Switch
              label="Capa sozinha na página dupla"
              checked={settings.coverAlone}
              onChange={(coverAlone) => set({ coverAlone })}
            />
          )}
        </section>
      )}

      <footer
        inert={!visible}
        className={`absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-ink-950/95 to-transparent px-2 pt-10 pb-[max(env(safe-area-inset-bottom),0.5rem)] transition-opacity duration-200 ${footerPass}`}
      >
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <IconButton label="Atalhos (?)" onClick={props.onHelp}>
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <path d="M12 17h.01" />
          </IconButton>
          <Scrubber
            page={props.page}
            pageCount={props.pageCount}
            pageLabel={props.pageLabel}
            rtl={settings.direction === 'rtl' && !webtoon}
            onSeek={props.onSeek}
          />
          <span className="w-20 shrink-0 text-right font-display font-bold text-ink-50 text-lg tabular-nums">
            {props.pageLabel} / {props.pageCount}
          </span>
          {props.onGuided && (
            <GuidedButton
              onClick={props.onGuided}
              hint={!!props.guidedHint && visible}
              onHintDismiss={props.onGuidedHintDismiss}
            />
          )}
          <IconButton
            label="Configurações de leitura"
            onClick={props.onPanelToggle}
            pressed={props.panelOpen}
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </IconButton>
        </div>
      </footer>

      {/* A cinta (obi) do volume: fica sempre visível, mesmo com as barras escondidas. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-1 bg-white/10"
      >
        <div
          className={`h-full bg-obi-500 transition-[width] duration-300 motion-reduce:transition-none ${
            settings.direction === 'rtl' && !webtoon ? 'ml-auto' : ''
          }`}
          style={{
            width: `${props.pageCount ? ((props.page + 1) / props.pageCount) * 100 : 0}%`,
          }}
        />
      </div>
    </>
  );
}

/**
 * Botão da leitura guiada. Na primeira vez, um anel dourado pulsa e um balão
 * conta o que ele faz (o recurso não é um gesto escondido).
 */
function GuidedButton({
  onClick,
  hint,
  onHintDismiss,
}: {
  onClick: () => void;
  hint: boolean;
  onHintDismiss?: (() => void) | undefined;
}) {
  return (
    <div className="relative shrink-0">
      {hint && (
        <div className="absolute right-0 bottom-full mb-3 w-60 animate-[gutter-rise_320ms_cubic-bezier(0.16,1,0.3,1)] rounded-xl bg-ink-800 p-3 text-left shadow-2xl shadow-black/60 ring-1 ring-white/10 motion-reduce:animate-none">
          <p className="font-semibold text-ink-50 text-sm">Leitura guiada</p>
          <p className="mt-1 text-ink-200 text-xs leading-relaxed">
            Cada balão vem para perto, numa lupa, com a página inteira ao fundo. Toque para seguir;
            tecla B no teclado.
          </p>
          <button
            type="button"
            onClick={onHintDismiss}
            className={`mt-2 min-h-9 rounded-md bg-white/10 px-3 font-medium text-ink-50 text-xs hover:bg-white/15 pointer-coarse:min-h-11 ${FOCUS}`}
          >
            Entendi
          </button>
          <span
            aria-hidden="true"
            className="absolute right-4 -bottom-1.5 size-3 rotate-45 bg-ink-800"
          />
        </div>
      )}
      <button
        type="button"
        aria-label="Leitura guiada, balão a balão (B)"
        title="Leitura guiada, balão a balão (B)"
        aria-keyshortcuts="B"
        onClick={onClick}
        className={`relative grid size-11 place-items-center rounded-full text-white hover:bg-white/10 ${FOCUS}`}
      >
        {hint && (
          <span
            aria-hidden="true"
            className="absolute inset-0 animate-ping rounded-full ring-2 ring-gold-400/70 motion-reduce:animate-none"
          />
        )}
        <svg
          viewBox="0 0 24 24"
          className="size-5"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.8A8 8 0 1 1 21 12z" />
          <path d="M9 11h6M9 14h4" />
        </svg>
      </button>
    </div>
  );
}

function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`flex min-h-11 w-full items-center justify-between gap-4 rounded-lg text-left text-ink-100 text-sm ${FOCUS}`}
    >
      {label}
      <span
        aria-hidden="true"
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-ink-50' : 'bg-white/10 ring-1 ring-white/20'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 size-5 rounded-full shadow transition-transform motion-reduce:transition-none ${checked ? 'translate-x-5 bg-ink-900' : 'bg-ink-300'}`}
        />
      </span>
    </button>
  );
}

/** Largura do polegar nativo do range no Chromium/WebKit (px). */
const THUMB = 16;

/** Slider de páginas com balão "Pág. N" acima do polegar enquanto arrasta. */
function Scrubber(props: {
  page: number;
  pageCount: number;
  pageLabel: string;
  rtl: boolean;
  onSeek: (page: number) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const max = Math.max(0, props.pageCount - 1);
  const ratio = max === 0 ? 0 : props.page / max;
  const pos = props.rtl ? 1 - ratio : ratio;

  return (
    <div className="relative flex min-w-0 flex-1 items-center">
      {dragging && (
        <span
          aria-hidden="true"
          className="-translate-x-1/2 pointer-events-none absolute bottom-full mb-1 rounded-lg bg-white px-2.5 py-1 font-semibold text-ink-900 text-sm tabular-nums shadow-black/40 shadow-lg"
          style={{ left: `calc(${pos} * (100% - ${THUMB}px) + ${THUMB / 2}px)` }}
        >
          Pág. {props.pageLabel}
        </span>
      )}
      <input
        type="range"
        aria-label="Página"
        aria-valuetext={`Página ${props.pageLabel} de ${props.pageCount}`}
        min={0}
        max={max}
        value={props.page}
        dir={props.rtl ? 'rtl' : 'ltr'}
        onChange={(e) => props.onSeek(Number(e.target.value))}
        onPointerDown={() => setDragging(true)}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
        onBlur={() => setDragging(false)}
        className={`h-11 w-full cursor-pointer accent-obi-500 ${FOCUS}`}
      />
    </div>
  );
}

function Segmented<T extends string>(props: {
  label: string;
  options: [T, string][];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1.5 font-medium text-ink-200 text-xs">{props.label}</legend>
      <div className="flex rounded-lg bg-ink-800 p-0.5">
        {props.options.map(([value, text]) => (
          <button
            key={value}
            type="button"
            aria-pressed={props.value === value}
            onClick={() => props.onChange(value)}
            className={`min-h-10 flex-1 rounded-md px-2 text-xs transition-colors ${FOCUS} ${
              props.value === value
                ? 'bg-ink-600 font-semibold text-ink-50'
                : 'text-ink-100 hover:bg-ink-700'
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function IconButton(props: {
  label: string;
  onClick: () => void;
  pressed?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={props.label}
      aria-pressed={props.pressed}
      title={props.label}
      onClick={props.onClick}
      className={`grid size-11 shrink-0 place-items-center rounded-full text-white hover:bg-white/10 ${props.pressed ? 'bg-white/15' : ''} ${FOCUS}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="size-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {props.children}
      </svg>
    </button>
  );
}

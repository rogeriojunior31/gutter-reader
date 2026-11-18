import type { ReadingDirection } from '@gutter/core';
import { type Ref, useEffect, useRef } from 'react';
import type { Lens } from './guided.ts';

const FOCUS =
  'focus-visible:outline-2 focus-visible:outline-gold-400 focus-visible:outline-offset-2';
const EASE = 'duration-[420ms] ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none';
const MOVE = `transition-[left,top,width,height] ${EASE}`;

/**
 * Camada da leitura guiada. A página fica inteira ao fundo (quadrinho se lê
 * pelos desenhos); só o balão vem para perto, numa lupa por cima do próprio
 * lugar, e desliza de balão em balão. A página escurece de leve, só o bastante
 * para a lupa se destacar.
 */
export function GuidedLayer({
  lens,
  url,
  dim,
  status,
  direction,
  onPrev,
  onNext,
  onExit,
}: {
  lens: Lens | null;
  /** Imagem da página do balão atual. */
  url: string | null;
  /** Quanto escurecer a página (mais leve em páginas claras). */
  dim: number;
  /** Texto da posição ("Balão 3 de 8 · pág. 4", "Procurando balões…"). */
  status: string;
  direction: ReadingDirection;
  onPrev: () => void;
  onNext: () => void;
  onExit: () => void;
}) {
  const rtl = direction === 'rtl';
  const next = useRef<HTMLButtonElement>(null);

  // O foco vai para a barra ao entrar (quem entrou pelo teclado continua nela).
  useEffect(() => {
    next.current?.focus({ preventScroll: true });
  }, []);

  return (
    <>
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 z-20 overflow-hidden bg-ink-950 transition-opacity ${EASE}`}
        style={{ opacity: lens ? dim : 0 }}
      />
      {lens && url && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute z-20 overflow-hidden rounded-xl bg-white shadow-[0_24px_48px_-12px_rgb(0_0_0/0.75)] ring-2 ring-gold-400/80 ${MOVE}`}
          style={{ left: lens.left, top: lens.top, width: lens.width, height: lens.height }}
        >
          <img
            src={url}
            alt=""
            draggable={false}
            className={`absolute max-w-none select-none ${MOVE}`}
            style={{
              width: lens.page.width * lens.zoom,
              height: lens.page.height * lens.zoom,
              left: -lens.src.x * lens.page.width * lens.zoom,
              top: -lens.src.y * lens.page.height * lens.zoom,
            }}
          />
        </div>
      )}

      <div
        role="toolbar"
        aria-label="Leitura guiada"
        className="-translate-x-1/2 absolute bottom-[max(env(safe-area-inset-bottom),0.75rem)] left-1/2 z-30 flex animate-[gutter-rise_260ms_cubic-bezier(0.16,1,0.3,1)] items-center gap-1 rounded-full bg-ink-850/95 p-1 text-ink-100 text-sm shadow-black/60 shadow-xl ring-1 ring-white/10 motion-reduce:animate-none [@media(max-height:500px)]:bottom-1.5 [@media(max-height:500px)]:p-0.5"
      >
        <BarButton
          label={rtl ? 'Próximo balão' : 'Balão anterior'}
          onClick={rtl ? onNext : onPrev}
          path="M15 18l-6-6 6-6"
          buttonRef={rtl ? next : undefined}
        />
        <p
          className="min-w-40 px-1 text-center tabular-nums [@media(max-height:500px)]:min-w-32 [@media(max-height:500px)]:text-xs"
          aria-live="polite"
          aria-atomic="true"
        >
          {status}
        </p>
        <BarButton
          label={rtl ? 'Balão anterior' : 'Próximo balão'}
          onClick={rtl ? onPrev : onNext}
          path="M9 18l6-6-6-6"
          buttonRef={rtl ? undefined : next}
        />
        <span aria-hidden="true" className="mx-1 h-6 w-px bg-white/10" />
        <BarButton
          label="Sair da leitura guiada (Esc)"
          onClick={onExit}
          path="M18 6 6 18M6 6l12 12"
        />
      </div>
    </>
  );
}

function BarButton({
  label,
  onClick,
  path,
  buttonRef,
}: {
  label: string;
  onClick: () => void;
  path: string;
  buttonRef?: Ref<HTMLButtonElement> | undefined;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`grid size-10 place-items-center rounded-full hover:bg-white/10 pointer-coarse:size-11 [@media(max-height:500px)]:size-9 ${FOCUS}`}
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
        <path d={path} />
      </svg>
    </button>
  );
}

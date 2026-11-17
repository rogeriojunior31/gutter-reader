import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useCoverColor } from '../lib/cover-color.ts';
import { useThumbnailUrl } from '../lib/queries.ts';

export type SpineStatus = 'read' | 'reading' | 'unread';
export type SpineSize = 'sm' | 'md' | 'lg';

export const SPINE_HEIGHT: Record<SpineSize, number> = { sm: 180, md: 240, lg: 300 };
/** Largura da prévia da capa + folga. */
const PREVIEW_ROOM = 190;

const STATUS_LABEL: Record<SpineStatus, string> = {
  read: 'lido',
  reading: 'lendo',
  unread: 'não lido',
};

/**
 * Nome de View Transition compartilhado entre a capa (Frente) e a lombada (Lado)
 * do mesmo item: ao trocar de visão, o navegador transforma uma na outra.
 */
export function turnName(id: string | undefined): string | undefined {
  return id ? `turn-${id.replace(/[^a-zA-Z0-9_-]/g, '_')}` : undefined;
}

/** Só a lombada desenhada: usada na estante e no destaque do Início. */
export function SpineBand({
  coverBookId,
  number,
  unit,
  spineTitle,
  label,
  status,
  progress,
  size = 'md',
  className = '',
  style,
}: {
  coverBookId: string | undefined;
  number: string;
  /** Unidade junto ao número (ex.: "livros" numa caixa de série). */
  unit?: string | undefined;
  spineTitle: string;
  label?: string | undefined;
  status: SpineStatus;
  progress?: number | undefined;
  size?: SpineSize;
  className?: string;
  style?: CSSProperties;
}) {
  const color = useCoverColor(coverBookId);
  const big = size === 'sm' ? 26 : size === 'lg' ? 40 : 34;
  return (
    <span
      className={`flex flex-col items-center overflow-hidden rounded-[3px] border-white/10 border-x shadow-[inset_-6px_0_10px_-6px_rgb(0_0_0/0.55),inset_4px_0_6px_-4px_rgb(255_255_255/0.12)] ${className}`}
      style={{ background: color ?? 'var(--color-ink-700)', ...style }}
    >
      {label && (
        <span className="mt-2 w-[78%] truncate rounded-[2px] bg-ink-100 px-1 py-0.5 text-center font-semibold text-[11px] text-ink-900 uppercase leading-none">
          {label}
        </span>
      )}
      <span
        className="mt-2 font-display font-extrabold text-white leading-none tabular-nums"
        style={{ fontSize: unit ? Math.round(big * 0.7) : big }}
      >
        {number}
      </span>
      {unit && (
        <span className="font-semibold text-[11px] text-white/80 uppercase leading-tight">
          {unit}
        </span>
      )}
      <span className="mt-3 min-h-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap font-display font-semibold text-sm text-white/85 uppercase tracking-wide [writing-mode:vertical-rl]">
        {spineTitle}
      </span>

      {/* Cinta (obi): vermelha lendo, dourada lido. */}
      {status !== 'unread' && (
        <span
          className={`mt-2 flex h-9 w-full items-center justify-center ${status === 'read' ? 'bg-gold-400' : 'bg-obi-500'}`}
        >
          {status === 'reading' && (
            <span className="h-1 w-[70%] overflow-hidden rounded-full bg-black/30">
              <span
                className="block h-full bg-white"
                style={{ width: `${Math.round((progress ?? 0) * 100)}%` }}
              />
            </span>
          )}
        </span>
      )}

      {/* Célula de estado fixa: cheia lido, meia lendo, vazia não lido. */}
      <span
        aria-hidden="true"
        className="my-2 size-3 shrink-0 rounded-full border-2 border-white/80"
        style={{
          background:
            status === 'read'
              ? 'white'
              : status === 'reading'
                ? 'linear-gradient(to top, white 50%, transparent 50%)'
                : 'transparent',
        }}
      />
    </span>
  );
}

interface Props {
  to: string;
  /** Livro cuja capa dá cor e aparece ao puxar. */
  coverBookId: string | undefined;
  /** Id do item (série ou livro) para a transição Frente↔Lado. */
  turnId?: string;
  number: string;
  unit?: string;
  spineTitle: string;
  label?: string;
  /** Nome acessível do link. */
  ariaLabel: string;
  status: SpineStatus;
  progress?: number | undefined;
  /** Largura relativa (páginas do volume, livros da série). */
  weight?: number;
  size?: SpineSize;
  /** Linha extra na prévia. */
  detail?: string;
}

/**
 * Lombada na estante. Puxar o livro (passar o mouse, focar ou o primeiro toque)
 * sobe a lombada e mostra a capa ao lado, com o progresso na cinta (obi).
 * A capa só existe enquanto o livro está puxado: escondida, não ocupa layout.
 * No toque: 1º toque puxa e oferece "Abrir"; tocar fora devolve à estante.
 */
export function Spine({
  to,
  coverBookId,
  turnId,
  number,
  unit,
  spineTitle,
  label,
  ariaLabel,
  status,
  progress,
  weight = 1,
  size = 'md',
  detail,
}: Props) {
  const [pulled, setPulled] = useState<false | 'pointer' | 'touch' | 'keyboard'>(false);
  const [left, setLeft] = useState(false);
  const item = useRef<HTMLLIElement>(null);
  const preview = useRef<HTMLSpanElement>(null);
  const lastPointer = useRef<string>('mouse');

  const pull = (how: 'pointer' | 'touch' | 'keyboard') => {
    const el = item.current;
    if (el) {
      const shelf = el.closest('ul')?.getBoundingClientRect();
      const right = shelf ? Math.min(shelf.right, window.innerWidth) : window.innerWidth;
      setLeft(el.getBoundingClientRect().right + PREVIEW_ROOM > right);
    }
    setPulled(how);
  };

  // Toque: um toque fora devolve o livro à estante.
  useEffect(() => {
    if (pulled !== 'touch') return;
    const onDown = (e: PointerEvent) => {
      if (!item.current?.contains(e.target as Node)) setPulled(false);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [pulled]);

  // Teclado e toque: a capa puxada (e o botão Abrir) precisa caber na tela.
  // As margens de rolagem da prévia descontam o topo e a barra de abas fixa.
  useEffect(() => {
    if (pulled === 'keyboard' || pulled === 'touch') {
      preview.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
  }, [pulled]);

  const cover = useThumbnailUrl(pulled ? coverBookId : undefined);
  const h = SPINE_HEIGHT[size];
  const w = Math.round(Math.min(78, Math.max(40, 30 + weight * 18)) * (size === 'sm' ? 0.82 : 1));
  const remaining = status === 'reading' ? 1 - (progress ?? 0) : 0;
  const touch = pulled === 'touch';

  return (
    <li
      ref={item}
      className={`relative shrink-0 ${pulled ? 'z-20' : ''}`}
      style={{ width: w, height: h }}
      onMouseLeave={() => pulled === 'pointer' && setPulled(false)}
    >
      <Link
        to={to}
        aria-label={`${ariaLabel}, ${STATUS_LABEL[status]}`}
        aria-expanded={touch || undefined}
        className="group relative block h-full w-full rounded-[3px] focus-visible:outline-none"
        onPointerDown={(e) => {
          lastPointer.current = e.pointerType;
        }}
        onMouseEnter={() => lastPointer.current === 'mouse' && pull('pointer')}
        onFocus={(e) => {
          if (e.currentTarget.matches(':focus-visible')) pull('keyboard');
        }}
        onBlur={(e) => {
          if (pulled === 'keyboard' && !item.current?.contains(e.relatedTarget as Node)) {
            setPulled(false);
          }
        }}
        onClick={(e) => {
          // No toque, o primeiro toque só puxa o livro.
          if (lastPointer.current !== 'mouse' && !pulled) {
            e.preventDefault();
            pull('touch');
          }
        }}
      >
        <SpineBand
          coverBookId={coverBookId}
          number={number}
          unit={unit}
          spineTitle={spineTitle}
          label={label}
          status={status}
          progress={progress}
          size={size}
          className={`absolute inset-0 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-focus-visible:outline-2 group-focus-visible:outline-gold-400 group-focus-visible:outline-offset-2 motion-reduce:transition-none ${
            pulled ? '-translate-y-3' : ''
          }`}
          style={{ viewTransitionName: turnName(turnId) }}
        />
      </Link>

      {/* Capa puxada da estante (só existe enquanto puxada). */}
      {pulled && (
        <span
          ref={preview}
          className={`absolute top-[-12px] z-30 w-40 scroll-mt-20 scroll-mb-24 animate-[gutter-rise_240ms_cubic-bezier(0.16,1,0.3,1)] motion-reduce:animate-none ${
            touch ? '' : 'pointer-events-none'
          } ${left ? 'right-[calc(100%+8px)]' : 'left-[calc(100%+8px)]'}`}
        >
          <span
            aria-hidden="true"
            className="relative block aspect-[2/3] overflow-hidden rounded-md bg-ink-800 shadow-2xl shadow-black/60 ring-1 ring-white/10"
          >
            {cover && <img src={cover} alt="" className="h-full w-full object-cover" />}
            {status === 'reading' && (
              <span
                className="absolute bottom-[14%] left-0 flex h-7 items-center bg-obi-600 pl-2 font-display font-bold text-sm text-white uppercase"
                style={{ width: `${Math.max(28, Math.round(remaining * 100))}%` }}
              >
                {remaining > 0.18 ? 'falta' : ''}
              </span>
            )}
          </span>
          <span className="mt-2 block rounded-md bg-ink-800/95 px-2.5 py-2 text-xs shadow-xl shadow-black/40">
            <span aria-hidden={!touch} className="block truncate font-semibold text-ink-50">
              {ariaLabel}
            </span>
            {detail && <span className="block truncate text-ink-300">{detail}</span>}
            {touch && (
              <Link
                to={to}
                className="mt-2 flex h-11 items-center justify-center rounded-md bg-obi-600 font-semibold text-sm text-white"
              >
                Abrir
              </Link>
            )}
          </span>
        </span>
      )}
    </li>
  );
}

const ROW_GAP = 44;
const BOARD = 10;
const LIFT = 16;

/** Gradiente da tábua sob uma fileira de altura `h`. */
export function boardGradient(h: number): string {
  return `linear-gradient(to bottom, transparent 0 ${h}px, var(--color-ink-700) ${h}px ${h + BOARD}px, rgb(0 0 0 / 0.35) ${h + BOARD}px ${h + BOARD + 6}px, transparent ${h + BOARD + 6}px)`;
}

/**
 * Estante: as lombadas ficam em pé, em fileiras que quebram com a largura.
 * Cada fileira ganha sua tábua: um fundo que se repete na altura exata da fileira.
 */
export function SpineShelf({
  size = 'md',
  label,
  children,
}: {
  size?: SpineSize;
  label: string;
  children: ReactNode;
}) {
  const h = SPINE_HEIGHT[size];
  return (
    <ul
      aria-label={label}
      className="flex list-none flex-wrap items-end gap-x-1.5"
      style={{
        rowGap: ROW_GAP,
        paddingTop: LIFT,
        paddingBottom: ROW_GAP - BOARD,
        backgroundImage: boardGradient(h),
        backgroundSize: `100% ${h + ROW_GAP}px`,
        backgroundPositionY: LIFT,
      }}
    >
      {children}
    </ul>
  );
}

/**
 * Tábua sob uma capa: em grade com `gap-x-4`, as tábuas das capas vizinhas se
 * encostam e formam uma prateleira contínua. A Frente é a mesma estante, virada.
 */
export function Ledge() {
  return (
    <span
      aria-hidden="true"
      className="mx-[calc(var(--ledge-gap,1rem)/-2)] block h-2.5 bg-ink-700 shadow-[0_8px_14px_-8px_rgb(0_0_0/0.7)]"
    />
  );
}

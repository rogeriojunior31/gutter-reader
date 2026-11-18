import type { ReadingDirection } from '@gutter/core';

/**
 * Dica de primeira leitura: mostra as três zonas de toque (espelhadas no RTL).
 * Some no primeiro toque ou tecla; quem usa o Reader decide quando mostrar.
 */
export function TapHint({
  direction,
  onDismiss,
}: {
  direction: ReadingDirection;
  onDismiss: () => void;
}) {
  const rtl = direction === 'rtl';
  const zones = [
    { label: rtl ? 'Próxima' : 'Anterior', arrow: 'left' as const },
    { label: 'Menu', arrow: null },
    { label: rtl ? 'Anterior' : 'Próxima', arrow: 'right' as const },
  ];

  return (
    <button
      type="button"
      aria-label="Fechar dica de navegação"
      onClick={onDismiss}
      className="absolute inset-0 z-30 grid animate-[gutter-fade_400ms_ease-out] grid-cols-3 bg-black/55 text-left motion-reduce:animate-none"
    >
      {zones.map((z, i) => (
        <span
          key={z.label}
          className={`flex flex-col items-center justify-center gap-2 ${i === 1 ? 'border-white/25 border-x border-dashed' : ''}`}
        >
          {z.arrow && (
            <svg
              viewBox="0 0 24 24"
              className="size-8 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d={z.arrow === 'left' ? 'M15 18l-6-6 6-6' : 'M9 18l6-6-6-6'} />
            </svg>
          )}
          <span className="font-semibold text-sm text-white">{z.label}</span>
        </span>
      ))}
      <span className="-translate-x-1/2 absolute bottom-[max(env(safe-area-inset-bottom),6rem)] left-1/2 w-max max-w-[calc(100vw-2rem)] rounded-full text-center bg-ink-850/90 px-4 py-2 text-ink-100 text-xs">
        {rtl ? 'Leitura oriental · ' : ''}Toque, clique ou use as setas
      </span>
    </button>
  );
}

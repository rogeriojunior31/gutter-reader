import { type ReactNode, useEffect, useId, useRef, useState } from 'react';

/**
 * Painel não-modal ancorado num botão: fecha com Esc, clique fora ou ao sair o foco.
 * Para escolhas rápidas (filtros), onde um modal interromperia à toa.
 */
export function Popover({
  trigger,
  children,
  label,
  align = 'start',
  side = 'bottom',
}: {
  trigger: (props: {
    open: boolean;
    toggle: () => void;
    'aria-expanded': boolean;
    'aria-controls': string;
  }) => ReactNode;
  children: ReactNode;
  label: string;
  align?: 'start' | 'end';
  side?: 'top' | 'bottom';
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        root.current?.querySelector<HTMLElement>('[aria-expanded]')?.focus();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: onBlur só gerencia foco (fecha ao sair), não é interação
    <div
      ref={root}
      className="relative"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      {trigger({
        open,
        toggle: () => setOpen((o) => !o),
        'aria-expanded': open,
        'aria-controls': id,
      })}
      {open && (
        <section
          id={id}
          aria-label={label}
          className={`absolute z-40 w-[min(18rem,calc(100vw-2rem))] animate-[gutter-rise_180ms_cubic-bezier(0.16,1,0.3,1)] rounded-xl border border-white/10 bg-ink-850 p-1.5 shadow-2xl shadow-black/60 motion-reduce:animate-none ${
            align === 'end' ? 'right-0' : 'left-0'
          } ${side === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'}`}
        >
          {children}
        </section>
      )}
    </div>
  );
}

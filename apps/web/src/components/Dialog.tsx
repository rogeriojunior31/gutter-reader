import { X } from 'lucide-react';
import { type ReactNode, useEffect, useId, useRef } from 'react';
import { IconButton } from './ui.tsx';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Modal sobre o <dialog> nativo: foco preso, Esc e backdrop de graça.
 * Marque o primeiro campo com `data-autofocus`: o `showModal()` sempre põe o foco
 * no primeiro focável (o botão Fechar), então reposicionamos depois de abrir.
 */
export function Dialog({ open, onClose, title, children, footer }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
      el.querySelector<HTMLElement>('[data-autofocus]')?.focus();
    }
    if (!open && el.open) el.close();
  }, [open]);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Esc já fecha o <dialog> nativo
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      // O evento `close` também dispara quando nós mesmos fechamos (open → false);
      // só repassa se o fechamento veio do usuário (Esc).
      onClose={() => {
        if (open) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-ink-850 p-0 text-ink-50 shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      {open && (
        <div className="p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 id={titleId} className="font-semibold text-lg">
              {title}
            </h2>
            <IconButton label="Fechar" onClick={onClose} className="pointer-fine:size-10">
              <X className="size-4" />
            </IconButton>
          </div>
          {children}
          {footer && <div className="mt-6 flex justify-end gap-2">{footer}</div>}
        </div>
      )}
    </dialog>
  );
}

export const inputClass =
  'w-full rounded-lg border border-white/15 bg-ink-900 px-3 py-2.5 text-sm outline-none placeholder:text-ink-300 focus-visible:border-obi-500/70 focus-visible:outline-2 focus-visible:outline-gold-400/40';

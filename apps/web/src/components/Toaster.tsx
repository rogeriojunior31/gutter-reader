import { X } from 'lucide-react';
import { useToasts } from '../stores/toast.ts';

/** Região viva: leitores de tela anunciam o aviso sem roubar o foco. */
export function Toaster() {
  const { toasts, dismiss } = useToasts();
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-50 flex justify-center px-4 lg:bottom-6"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex max-w-md animate-[gutter-rise_240ms_cubic-bezier(0.16,1,0.3,1)] items-center gap-2 rounded-xl border border-white/10 bg-ink-800 py-1.5 pr-1.5 pl-4 text-sm shadow-black/50 shadow-xl motion-reduce:animate-none"
        >
          <span className="py-1.5 text-ink-50">{t.message}</span>
          {t.action && (
            <button
              type="button"
              onClick={async () => {
                dismiss(t.id);
                await t.action?.run();
              }}
              className="h-9 rounded-lg px-3 font-semibold text-obi-300 hover:bg-white/10"
            >
              {t.action.label}
            </button>
          )}
          <button
            type="button"
            aria-label="Fechar aviso"
            onClick={() => dismiss(t.id)}
            className="grid size-9 place-items-center rounded-lg text-ink-200 hover:bg-white/10"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

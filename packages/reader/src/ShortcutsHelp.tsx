import { useEffect, useRef } from 'react';
import { READER_SHORTCUTS } from './shortcuts.ts';

/** Ajuda de atalhos como <dialog> modal: foco preso, anunciado por leitores de tela. */
export function ShortcutsHelp({ rtl, onClose }: { rtl: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  // Sem close() na limpeza: no StrictMode ele dispararia um evento `close`
  // atrasado que desmontaria a ajuda logo após abrir. Ao desmontar, o
  // <dialog> sai do DOM e o navegador encerra o modal sozinho.
  useEffect(() => {
    const el = ref.current;
    if (el && !el.open) el.showModal();
  }, []);

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: Esc fecha o <dialog> nativo
    <dialog
      ref={ref}
      aria-labelledby="reader-help-title"
      // `cancel` sai junto com o Esc; `close` só numa tarefa seguinte. Avisar já no
      // cancel evita engolir uma tecla apertada logo depois.
      onCancel={onClose}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="m-auto w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-white/10 bg-ink-850 p-5 text-ink-50 shadow-2xl backdrop:bg-black/70"
    >
      <h2
        id="reader-help-title"
        className="mb-4 font-display font-extrabold text-2xl uppercase tracking-wide"
      >
        Atalhos
      </h2>
      <dl className="space-y-2 text-sm">
        {READER_SHORTCUTS.map(({ keys, label }) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-ink-200">{label}</dt>
            <dd className="flex shrink-0 gap-1">
              {keys.map((k) => (
                <kbd
                  key={k}
                  className="min-w-7 rounded-md border border-white/15 border-b-2 bg-white/5 px-1.5 py-0.5 text-center font-sans text-ink-50 text-xs"
                >
                  {k}
                </kbd>
              ))}
            </dd>
          </div>
        ))}
      </dl>
      {rtl && (
        <p className="mt-4 text-ink-100 text-xs">
          Leitura oriental: as setas e as laterais da tela ficam invertidas.
        </p>
      )}
      <p className="mt-3 text-ink-300 text-xs">
        No toque: as laterais viram a página, o centro mostra as barras.
      </p>
      <button
        type="button"
        onClick={onClose}
        className="mt-5 h-11 w-full rounded-lg bg-white/10 font-medium text-sm hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-gold-400"
      >
        Entendi
      </button>
    </dialog>
  );
}

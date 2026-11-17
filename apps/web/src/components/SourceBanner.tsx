import { FolderLock, TriangleAlert } from 'lucide-react';
import { useSourceStore } from '../sources/source-store.ts';
import { Button } from './ui.tsx';

/** Avisos sobre a fonte ativa: reautorizar a pasta salva, lendo, erro. */
export function SourceBanner() {
  const { status, label, error, reconnect, switchToDemo } = useSourceStore();

  if (status === 'needs-permission') {
    return (
      <div className="mb-8 flex flex-wrap items-center gap-4 rounded-2xl border border-obi-500/30 bg-obi-500/10 p-4">
        <FolderLock className="size-5 shrink-0 text-obi-300" aria-hidden="true" />
        <p className="min-w-0 flex-1 text-sm">
          <span className="font-semibold">Permita ler “{label}” de novo.</span>{' '}
          <span className="text-ink-100">
            Por segurança o navegador pede essa confirmação a cada visita.
          </span>
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => void switchToDemo()}>
            Usar demonstração
          </Button>
          <Button variant="primary" onClick={() => void reconnect()}>
            Abrir “{label}”
          </Button>
        </div>
      </div>
    );
  }

  if (status === 'error' && error) {
    return (
      <div
        role="alert"
        className="mb-8 flex flex-wrap items-center gap-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-4"
      >
        <TriangleAlert className="size-5 shrink-0 text-red-300" aria-hidden="true" />
        <p className="min-w-0 flex-1 text-sm">
          <span className="font-semibold">Não deu para abrir a pasta.</span>{' '}
          <span className="text-ink-100">{error}</span>
        </p>
        <Button variant="ghost" onClick={() => void switchToDemo()}>
          Usar demonstração
        </Button>
      </div>
    );
  }

  if (status === 'loading') {
    return (
      <p role="status" className="mb-8 flex items-center gap-3 text-ink-200 text-sm">
        <span className="size-4 animate-spin rounded-full border-2 border-ink-700 border-t-gold-400 motion-reduce:animate-none" />
        Lendo “{label}”…
      </p>
    );
  }

  return null;
}

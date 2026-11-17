import { ChevronsUpDown, FlaskConical, FolderOpen } from 'lucide-react';
import { useSourceStore } from '../sources/source-store.ts';
import { OpenFolderButton } from './OpenFolderButton.tsx';
import { Popover } from './Popover.tsx';

const DOT = {
  ready: 'bg-emerald-400',
  loading: 'bg-ink-300 animate-pulse',
  'needs-permission': 'bg-gold-400',
  error: 'bg-red-400',
} as const;

/** Mostra de onde vem a biblioteca e permite trocar (pasta ↔ demonstração). */
export function SourceSwitcher({ compact = false }: { compact?: boolean }) {
  const { source, label, status, switchToDemo } = useSourceStore();
  const isDemo = source.kind === 'mock';
  const Icon = isDemo ? FlaskConical : FolderOpen;

  return (
    <Popover
      label="Fonte da biblioteca"
      side={compact ? 'bottom' : 'top'}
      align={compact ? 'end' : 'start'}
      trigger={({ toggle, ...aria }) =>
        compact ? (
          <button
            type="button"
            onClick={toggle}
            {...aria}
            className="flex h-9 max-w-44 items-center gap-1.5 rounded-full border border-white/15 px-3 text-ink-100 text-xs pointer-coarse:h-11"
          >
            <span className={`size-1.5 shrink-0 rounded-full ${DOT[status]}`} />
            <span className="truncate">{label}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={toggle}
            {...aria}
            className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left hover:bg-white/[0.06]"
          >
            <Icon className="size-4 shrink-0 text-ink-200" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-ink-300 text-xs">{isDemo ? 'Fonte' : 'Pasta'}</span>
              <span className="flex items-center gap-2 font-medium text-ink-50 text-sm">
                <span className="truncate">{label}</span>
                <span className={`size-1.5 shrink-0 rounded-full ${DOT[status]}`} />
              </span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-ink-300" aria-hidden="true" />
          </button>
        )
      }
    >
      <div className="space-y-1 p-1">
        <OpenFolderButton variant="ghost" className="w-full justify-start">
          {isDemo ? 'Abrir uma pasta…' : 'Trocar de pasta…'}
        </OpenFolderButton>
        {!isDemo && (
          <button
            type="button"
            onClick={() => void switchToDemo()}
            className="flex min-h-10 w-full items-center gap-2 rounded-lg px-4 text-left font-medium text-ink-200 text-sm hover:bg-white/10 hover:text-white pointer-coarse:min-h-11"
          >
            <FlaskConical className="size-4" aria-hidden="true" /> Usar demonstração
          </button>
        )}
      </div>
    </Popover>
  );
}

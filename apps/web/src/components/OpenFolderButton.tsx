import { FolderOpen } from 'lucide-react';
import type { ReactNode } from 'react';
import { canPickFolder, useSourceStore } from '../sources/source-store.ts';
import { buttonClass } from './ui.tsx';

const INPUT_ID = 'gutter-folder-input';

/**
 * Abre o seletor de pasta. No Chromium usa showDirectoryPicker (a pasta fica salva);
 * nos outros navegadores cai no <input webkitdirectory> (escolher de novo a cada visita).
 */
export function OpenFolderButton({
  variant = 'secondary',
  className = '',
  children,
}: {
  variant?: 'primary' | 'secondary' | 'ghost';
  className?: string;
  children?: ReactNode;
}) {
  const { pickFolder, status } = useSourceStore();
  const busy = status === 'loading';

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() =>
        canPickFolder ? void pickFolder() : document.getElementById(INPUT_ID)?.click()
      }
      className={buttonClass(variant, 'md', className)}
    >
      <FolderOpen className="size-4" aria-hidden="true" />
      {children ?? (busy ? 'Lendo pasta…' : 'Abrir pasta')}
    </button>
  );
}

/**
 * Input do fallback, montado uma vez no layout: se ficasse dentro de um popover,
 * sumiria ao abrir a janela de arquivos e a escolha se perderia.
 */
export function FolderInput() {
  const loadFromInput = useSourceStore((s) => s.loadFromInput);
  return (
    <input
      id={INPUT_ID}
      type="file"
      hidden
      // webkitdirectory não está nos tipos do React.
      {...{ webkitdirectory: '' }}
      multiple
      onChange={(e) => {
        if (e.target.files?.length) void loadFromInput(e.target.files);
        e.target.value = '';
      }}
    />
  );
}

import type { Source } from '@gutter/core';
import { create } from 'zustand';
import { db } from '../db/db.ts';
import { queryClient } from '../lib/query-client.ts';
import { filesFromDirectory, filesFromInput } from './local/files.ts';
import { LocalSource } from './local/local-source.ts';
import { MockSource } from './mock-source.ts';

export type SourceStatus = 'loading' | 'ready' | 'needs-permission' | 'error';

interface SourceState {
  source: Source;
  /** "Demonstração" ou o nome da pasta. */
  label: string;
  status: SourceStatus;
  error?: string;
  /** Livros ignorados por formato ainda não suportado (PDF, CB7). */
  skipped: number;
  /** Pasta salva aguardando o usuário reautorizar a leitura. */
  pending?: FileSystemDirectoryHandle;

  init(): Promise<void>;
  pickFolder(): Promise<void>;
  loadFromInput(list: FileList): Promise<void>;
  reconnect(): Promise<void>;
  switchToDemo(): Promise<void>;
}

const SOURCE_KEY = 'source.kind';
const DIR_ID = 'main';
const demo = new MockSource();

export const canPickFolder = typeof window !== 'undefined' && 'showDirectoryPicker' in window;

export const useSourceStore = create<SourceState>()((set, get) => {
  /**
   * Cada troca de fonte pega um "ticket"; só o mais recente pode ativar. Sem isso,
   * uma leitura lenta (ex.: o init no carregamento) terminaria depois da escolha
   * do usuário e a sobrescreveria.
   */
  let generation = 0;
  const ticket = () => ++generation;
  const current = (t: number) => t === generation;

  /** Troca a fonte ativa e descarta o cache de consultas da anterior. */
  const activate = (t: number, source: Source, label: string, skipped = 0) => {
    if (!current(t)) return;
    queryClient.clear();
    set({ source, label, skipped, status: 'ready', error: undefined, pending: undefined });
  };

  const fail = (t: number, err: unknown) => {
    if (!current(t)) return;
    if (err instanceof DOMException && err.name === 'AbortError') {
      set({ status: get().source ? 'ready' : 'error' }); // usuário cancelou o seletor
      return;
    }
    set({ status: 'error', error: err instanceof Error ? err.message : String(err) });
  };

  const openHandle = async (t: number, handle: FileSystemDirectoryHandle) => {
    if (current(t)) set({ status: 'loading', label: handle.name });
    const files = await filesFromDirectory(handle);
    const source = await LocalSource.create(handle.name, files);
    activate(t, source, handle.name, source.skipped.length);
  };

  return {
    source: demo,
    label: 'Demonstração',
    status: 'loading',
    skipped: 0,

    async init() {
      const t = ticket();
      try {
        const kind = (await db.kv.get(SOURCE_KEY))?.value;
        const saved = await db.directories.get(DIR_ID);
        if (kind !== 'local' || !saved) return activate(t, demo, 'Demonstração');
        const perm = (await saved.handle.queryPermission?.({ mode: 'read' })) ?? 'granted';
        if (perm === 'granted') return await openHandle(t, saved.handle);
        // O navegador exige um clique para liberar a leitura de novo.
        if (current(t)) {
          set({ status: 'needs-permission', label: saved.name, pending: saved.handle });
        }
      } catch (err) {
        fail(t, err);
      }
    },

    async pickFolder() {
      const t = ticket();
      try {
        const handle = await window.showDirectoryPicker?.({ id: 'gutter-library', mode: 'read' });
        if (!handle) return;
        await db.directories.put({ id: DIR_ID, name: handle.name, handle, addedAt: Date.now() });
        await db.kv.put({ key: SOURCE_KEY, value: 'local' });
        await openHandle(t, handle);
      } catch (err) {
        fail(t, err);
      }
    },

    async loadFromInput(list) {
      const t = ticket();
      try {
        set({ status: 'loading' });
        const { rootName, files } = filesFromInput(list);
        const source = await LocalSource.create(rootName, files);
        // Sem handle não dá para lembrar a pasta: na próxima visita volta para a demo.
        await db.kv.put({ key: SOURCE_KEY, value: 'demo' });
        activate(t, source, rootName, source.skipped.length);
      } catch (err) {
        fail(t, err);
      }
    },

    async reconnect() {
      const handle = get().pending;
      if (!handle) return;
      const t = ticket();
      try {
        const perm = (await handle.requestPermission?.({ mode: 'read' })) ?? 'granted';
        if (perm !== 'granted') {
          set({ error: 'Sem permissão de leitura, a pasta não pode ser aberta.' });
          return;
        }
        await openHandle(t, handle);
      } catch (err) {
        fail(t, err);
      }
    },

    async switchToDemo() {
      const t = ticket();
      await db.kv.put({ key: SOURCE_KEY, value: 'demo' });
      activate(t, demo, 'Demonstração');
    },
  };
});

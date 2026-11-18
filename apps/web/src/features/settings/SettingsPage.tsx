import type { ReaderSettings } from '@gutter/core';
import {
  DIRECTION_OPTIONS,
  FIT_OPTIONS,
  GUIDED_ZOOM_OPTIONS,
  LAYOUT_OPTIONS,
  READER_SHORTCUTS,
} from '@gutter/reader';
import { HardDrive, Keyboard, RotateCcw, Trash2 } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { Dialog } from '../../components/Dialog.tsx';
import { Button, PageHeader, Segmented } from '../../components/ui.tsx';
import {
  clearSeriesPrefs,
  saveGlobalSettings,
  useGlobalSettings,
  useSeriesPrefsCount,
} from '../../db/prefs.ts';
import { clearAllProgress } from '../../db/progress.ts';

export function SettingsPage() {
  const settings = useGlobalSettings();
  const prefsCount = useSeriesPrefsCount();
  const storage = useStorageEstimate();
  const [confirm, setConfirm] = useState<'progress' | null>(null);

  const set = (patch: Partial<ReaderSettings>) => {
    if (settings) void saveGlobalSettings({ ...settings, ...patch });
  };

  return (
    <div className="max-w-3xl">
      <PageHeader title="Ajustes" />

      <div className="space-y-8">
        <Section
          title="Leitura"
          description="Padrão para séries sem preferência própria. Mangás e webtoons são detectados automaticamente."
        >
          {settings && (
            <div className="space-y-5">
              <Field label="Layout">
                <Segmented
                  label="Layout"
                  options={LAYOUT_OPTIONS}
                  value={settings.layout}
                  onChange={(layout) => set({ layout })}
                />
              </Field>
              <Field label="Direção">
                <Segmented
                  label="Direção"
                  options={DIRECTION_OPTIONS}
                  value={settings.direction}
                  onChange={(direction) => set({ direction })}
                />
              </Field>
              <Field label="Ajuste da página">
                <Segmented
                  label="Ajuste da página"
                  options={FIT_OPTIONS}
                  value={settings.fit}
                  onChange={(fit) => set({ fit })}
                />
              </Field>
              <Field label="Leitura guiada: aproximação do balão">
                <Segmented
                  label="Leitura guiada: aproximação do balão"
                  options={GUIDED_ZOOM_OPTIONS}
                  value={settings.guidedZoom ?? 'medium'}
                  onChange={(guidedZoom) => set({ guidedZoom })}
                />
              </Field>
              <Field label="Capa sozinha na página dupla">
                <Toggle
                  checked={settings.coverAlone}
                  onChange={(coverAlone) => set({ coverAlone })}
                />
              </Field>
            </div>
          )}
        </Section>

        <Section
          title="Dados neste navegador"
          description="Progresso, preferências e coleções ficam guardados só neste navegador por enquanto."
        >
          <div className="space-y-4">
            {storage && (
              <div>
                <div className="mb-2 flex items-center gap-2 text-sm">
                  <HardDrive className="size-4 text-ink-300" aria-hidden="true" />
                  <span className="text-ink-200">
                    {formatBytes(storage.usage)} usados de {formatBytes(storage.quota)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full bg-ink-300"
                    style={{ width: `${Math.max(1, (storage.usage / storage.quota) * 100)}%` }}
                  />
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="secondary" disabled={!prefsCount} onClick={() => clearSeriesPrefs()}>
                <RotateCcw className="size-4" /> Redefinir preferências de {prefsCount}{' '}
                {prefsCount === 1 ? 'série' : 'séries'}
              </Button>
              <Button variant="danger" onClick={() => setConfirm('progress')}>
                <Trash2 className="size-4" /> Apagar todo o progresso
              </Button>
            </div>
          </div>
        </Section>

        <Section title="Atalhos do leitor">
          <div className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
            {READER_SHORTCUTS.map(({ keys, label }) => (
              <div key={label} className="flex items-center justify-between gap-4 text-sm">
                <span className="text-ink-200">{label}</span>
                <span className="flex shrink-0 gap-1">
                  {keys.map((k) => (
                    <kbd
                      key={k}
                      className="min-w-7 rounded-md border border-white/15 border-b-2 bg-white/5 px-1.5 py-0.5 text-center font-sans text-ink-100 text-xs"
                    >
                      {k}
                    </kbd>
                  ))}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 flex items-center gap-2 text-ink-300 text-xs">
            <Keyboard className="size-3.5" aria-hidden="true" /> Na leitura oriental as setas ficam
            invertidas. No toque: laterais viram a página, o centro mostra as barras.
          </p>
        </Section>

        <p className="text-ink-300 text-xs">
          Gutter{import.meta.env.DEV ? ' · desenvolvimento' : ''}
        </p>
      </div>

      <Dialog
        open={confirm === 'progress'}
        onClose={() => setConfirm(null)}
        title="Apagar todo o progresso?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirm(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                await clearAllProgress();
                setConfirm(null);
              }}
            >
              <Trash2 className="size-4" aria-hidden="true" /> Apagar progresso
            </Button>
          </>
        }
      >
        <p className="text-ink-200 text-sm">
          Todos os livros voltam a “não lido”. Coleções e preferências não são afetadas. Não dá para
          desfazer.
        </p>
      </Dialog>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/5 bg-white/[0.02] p-5 sm:p-6">
      <h2 className="font-display font-extrabold text-2xl uppercase tracking-wide">{title}</h2>
      {description && <p className="mt-1 text-ink-300 text-sm">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-ink-200 text-sm">{label}</span>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors pointer-coarse:my-2.5 ${checked ? 'bg-ink-50' : 'bg-white/10 ring-1 ring-white/20'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 size-5 rounded-full shadow transition-transform motion-reduce:transition-none ${
          checked ? 'translate-x-5 bg-ink-900' : 'bg-ink-300'
        }`}
      />
    </button>
  );
}

function useStorageEstimate() {
  const [estimate, setEstimate] = useState<{ usage: number; quota: number }>();
  useEffect(() => {
    navigator.storage
      ?.estimate()
      .then((e) => setEstimate({ usage: e.usage ?? 0, quota: e.quota ?? 1 }))
      .catch(() => {});
  }, []);
  return estimate;
}

function formatBytes(n: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let v = n;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

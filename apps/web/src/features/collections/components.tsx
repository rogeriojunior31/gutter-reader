import type { Collection, Series } from '@gutter/core';
import { Check, Layers, Pin, Plus } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { Link } from 'react-router';
import { Dialog, inputClass } from '../../components/Dialog.tsx';
import { Button } from '../../components/ui.tsx';
import {
  createCollection,
  toggleSeriesInCollection,
  updateCollection,
  useCollections,
  useCollectionsOfSeries,
} from '../../db/collections.ts';
import { useThumbnailUrl } from '../../lib/queries.ts';

/** Mosaico 2×2 com as capas das primeiras séries da coleção. */
export function CollectionCover({ series }: { series: (Series | undefined)[] }) {
  const slots = [0, 1, 2, 3].map((i) => series[i]);
  return (
    <div className="grid aspect-[4/3] grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden rounded-xl bg-ink-850 ring-1 ring-white/5">
      {slots.map((s, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: posições fixas do mosaico
        <MosaicTile key={i} bookId={s?.coverBookId} />
      ))}
    </div>
  );
}

function MosaicTile({ bookId }: { bookId: string | undefined }) {
  const url = useThumbnailUrl(bookId);
  if (!bookId) return <div className="bg-ink-800/60" />;
  return url ? (
    <img src={url} alt="" className="h-full w-full object-cover" />
  ) : (
    <div className="animate-pulse bg-ink-800" />
  );
}

export function CollectionCard({
  collection,
  seriesMap,
}: {
  collection: Collection;
  seriesMap: Map<string, Series>;
}) {
  const series = collection.seriesIds.map((id) => seriesMap.get(id));
  return (
    <Link to={`/collections/${collection.id}`} className="group block space-y-2.5">
      <div className="transition-transform duration-200 group-hover:-translate-y-1">
        <CollectionCover series={series} />
      </div>
      <div className="px-0.5">
        <p className="flex items-center gap-1.5 font-medium text-sm group-hover:text-obi-300">
          {collection.pinned && <Pin className="size-3 text-obi-300" />}
          <span className="truncate">{collection.name}</span>
        </p>
        <p className="text-ink-300 text-xs">
          {collection.seriesIds.length} {collection.seriesIds.length === 1 ? 'série' : 'séries'}
        </p>
      </div>
    </Link>
  );
}

/** Criar ou editar uma coleção. */
export function CollectionFormDialog({
  open,
  onClose,
  collection,
  initialSeriesIds,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  collection?: Collection;
  initialSeriesIds?: string[];
  onSaved?: (c: { id: string }) => void;
}) {
  const editing = !!collection;
  return (
    <Dialog open={open} onClose={onClose} title={editing ? 'Editar coleção' : 'Nova coleção'}>
      {/* Remonta o form ao abrir para zerar os campos */}
      {open && (
        <CollectionForm
          collection={collection}
          initialSeriesIds={initialSeriesIds}
          onCancel={onClose}
          onSaved={(c) => {
            onSaved?.(c);
            onClose();
          }}
        />
      )}
    </Dialog>
  );
}

function CollectionForm({
  collection,
  initialSeriesIds,
  onCancel,
  onSaved,
}: {
  collection: Collection | undefined;
  initialSeriesIds: string[] | undefined;
  onCancel: () => void;
  onSaved: (c: { id: string }) => void;
}) {
  const [name, setName] = useState(collection?.name ?? '');
  const [description, setDescription] = useState(collection?.description ?? '');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (collection) {
      await updateCollection(collection.id, { name: name.trim(), description: description.trim() });
      onSaved(collection);
    } else {
      onSaved(await createCollection({ name, description, seriesIds: initialSeriesIds ?? [] }));
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block space-y-1.5">
        <span className="text-ink-300 text-xs">Nome</span>
        <input
          data-autofocus
          required
          maxLength={80}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex.: Favoritos, Ler nas férias, Clássicos do terror"
          className={inputClass}
        />
      </label>
      <label className="block space-y-1.5">
        <span className="text-ink-300 text-xs">Descrição (opcional)</span>
        <textarea
          rows={3}
          maxLength={500}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`${inputClass} resize-none`}
        />
      </label>
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="primary" type="submit" disabled={!name.trim()}>
          {collection ? 'Salvar' : 'Criar coleção'}
        </Button>
      </div>
    </form>
  );
}

/** Lista de coleções com checkbox para incluir/remover uma série. */
export function AddToCollectionDialog({
  open,
  onClose,
  series,
}: {
  open: boolean;
  onClose: () => void;
  series: Series;
}) {
  const collections = useCollections();
  const member = useCollectionsOfSeries(series.id);
  const [creating, setCreating] = useState(false);

  return (
    <>
      <Dialog open={open && !creating} onClose={onClose} title="Adicionar à coleção">
        <p className="-mt-2 mb-4 text-ink-300 text-sm">{series.name}</p>
        <div className="-mx-2 max-h-72 space-y-0.5 overflow-y-auto">
          {collections?.length === 0 && (
            <p className="px-2 py-6 text-center text-ink-300 text-sm">
              Você ainda não tem coleções.
            </p>
          )}
          {collections?.map((c) => {
            const checked = member.has(c.id);
            return (
              <button
                key={c.id}
                type="button"
                aria-pressed={checked}
                onClick={() => toggleSeriesInCollection(c.id, series.id)}
                className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left hover:bg-white/5"
              >
                <span
                  className={`grid size-5 shrink-0 place-items-center rounded border ${
                    checked ? 'border-ink-100 bg-ink-100 text-ink-900' : 'border-white/20'
                  }`}
                >
                  {checked && <Check className="size-3.5" strokeWidth={3} />}
                </span>
                <Layers className="size-4 text-ink-300" />
                <span className="flex-1 truncate text-sm">{c.name}</span>
                <span className="text-ink-300 text-xs">{c.seriesIds.length}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex justify-between gap-2 border-white/5 border-t pt-4">
          <Button variant="ghost" onClick={() => setCreating(true)}>
            <Plus className="size-4" /> Nova coleção
          </Button>
          <Button variant="primary" onClick={onClose}>
            Pronto
          </Button>
        </div>
      </Dialog>
      <CollectionFormDialog
        open={open && creating}
        onClose={() => setCreating(false)}
        initialSeriesIds={[series.id]}
      />
    </>
  );
}

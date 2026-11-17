import { type Collection, naturalCompare, type Series } from '@gutter/core';
import {
  ArrowDown,
  ArrowDownUp,
  ArrowLeft,
  ArrowUp,
  Check,
  Layers,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Cover } from '../../components/Cover.tsx';
import { Dialog, inputClass } from '../../components/Dialog.tsx';
import { Popover } from '../../components/Popover.tsx';
import { SeriesCard } from '../../components/SeriesCard.tsx';
import { Button, COVER_GRID, EmptyState, IconButton } from '../../components/ui.tsx';
import {
  deleteCollection,
  moveSeriesInCollection,
  toggleSeriesInCollection,
  updateCollection,
  useCollection,
} from '../../db/collections.ts';
import { useSeriesStats } from '../../db/progress.ts';
import { useSeriesList, useSeriesMap } from '../../lib/queries.ts';
import { toast } from '../../stores/toast.ts';
import { CollectionCover, CollectionFormDialog } from './components.tsx';

const MENU_ITEM =
  'flex min-h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm hover:bg-white/5 pointer-coarse:min-h-11';

export function CollectionPage() {
  const { collectionId } = useParams();
  const collection = useCollection(collectionId);

  if (collection === undefined) return null;
  if (collection === null) {
    return (
      <EmptyState icon={<Layers className="size-5" />} title="Coleção não encontrada">
        <Link to="/collections" className="text-obi-300 hover:underline">
          Ver todas as coleções
        </Link>
      </EmptyState>
    );
  }
  return <CollectionView collection={collection} />;
}

function CollectionView({ collection }: { collection: Collection }) {
  const navigate = useNavigate();
  const seriesMap = useSeriesMap();
  const stats = useSeriesStats();
  const [editing, setEditing] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const series = collection.seriesIds
    .map((id) => seriesMap.get(id))
    .filter((s): s is Series => !!s);
  const books = series.reduce((n, s) => n + s.bookCount, 0);

  return (
    <div>
      <Link
        to="/collections"
        className="mb-6 inline-flex items-center gap-1.5 text-ink-300 text-sm hover:text-white"
      >
        <ArrowLeft className="size-4" /> Coleções
      </Link>

      <header className="mb-10 flex flex-col gap-6 sm:flex-row sm:items-end">
        <div className="w-full max-w-64 shrink-0 sm:w-56">
          <CollectionCover series={series} />
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display font-extrabold uppercase tracking-wide text-5xl leading-[0.92] sm:text-6xl">
            {collection.name}
          </h1>
          {collection.description && (
            <p className="mt-2 max-w-[65ch] text-ink-100">{collection.description}</p>
          )}
          <p className="mt-2 text-ink-300 text-sm">
            Coleção · {series.length} {series.length === 1 ? 'série' : 'séries'} · {books} livros
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => setAdding(true)}>
              <Plus className="size-4" /> Adicionar séries
            </Button>
            <Button onClick={() => updateCollection(collection.id, { pinned: !collection.pinned })}>
              {collection.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
              {collection.pinned ? 'Desafixar do Início' : 'Fixar no Início'}
            </Button>
            {series.length > 0 && (
              <Button
                variant={reordering ? 'primary' : 'ghost'}
                onClick={() => setReordering((r) => !r)}
              >
                {reordering ? <Check className="size-4" /> : <ArrowDownUp className="size-4" />}
                {reordering ? 'Concluir' : 'Organizar'}
              </Button>
            )}
            <Popover
              label="Mais ações da coleção"
              align="end"
              trigger={({ toggle, ...aria }) => (
                <IconButton label="Mais ações" onClick={toggle} {...aria}>
                  <MoreHorizontal className="size-4" />
                </IconButton>
              )}
            >
              <button type="button" onClick={() => setEditing(true)} className={MENU_ITEM}>
                <Pencil className="size-4 text-ink-200" aria-hidden="true" /> Renomear e descrever
              </button>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className={`${MENU_ITEM} text-red-300`}
              >
                <Trash2 className="size-4" aria-hidden="true" /> Excluir coleção
              </button>
            </Popover>
          </div>
        </div>
      </header>

      {series.length === 0 ? (
        <EmptyState icon={<Layers className="size-5" />} title="Coleção vazia">
          Use “Adicionar séries” para começar.
        </EmptyState>
      ) : reordering ? (
        <div className="max-w-2xl divide-y divide-white/5 overflow-hidden rounded-xl border border-white/5">
          {series.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3 bg-white/[0.02] p-2.5">
              <span className="w-6 text-center text-ink-300 text-sm tabular-nums">{i + 1}</span>
              <div className="w-10 shrink-0">
                <Cover bookId={s.coverBookId} alt="" />
              </div>
              <p className="min-w-0 flex-1 truncate font-medium text-sm">{s.name}</p>
              <IconButton
                label="Subir"
                disabled={i === 0}
                onClick={() => moveSeriesInCollection(collection.id, s.id, -1)}
              >
                <ArrowUp className="size-4" />
              </IconButton>
              <IconButton
                label="Descer"
                disabled={i === series.length - 1}
                onClick={() => moveSeriesInCollection(collection.id, s.id, 1)}
              >
                <ArrowDown className="size-4" />
              </IconButton>
              <IconButton
                label={`Remover ${s.name} da coleção`}
                onClick={async () => {
                  const before = collection.seriesIds;
                  await toggleSeriesInCollection(collection.id, s.id);
                  toast({
                    message: `${s.name} saiu de ${collection.name}`,
                    action: {
                      label: 'Desfazer',
                      run: () => updateCollection(collection.id, { seriesIds: before }),
                    },
                  });
                }}
                className="hover:text-red-300"
              >
                <X className="size-4" />
              </IconButton>
            </div>
          ))}
        </div>
      ) : (
        <div className={COVER_GRID}>
          {series.map((s) => (
            <SeriesCard key={s.id} series={s} stats={stats.get(s.id)} />
          ))}
        </div>
      )}

      <CollectionFormDialog
        open={editing}
        onClose={() => setEditing(false)}
        collection={collection}
      />
      <AddSeriesDialog open={adding} onClose={() => setAdding(false)} collection={collection} />
      <Dialog
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Excluir coleção?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={async () => {
                await deleteCollection(collection.id);
                navigate('/collections', { replace: true });
              }}
            >
              <Trash2 className="size-4" /> Excluir
            </Button>
          </>
        }
      >
        <p className="text-ink-300 text-sm">
          “{collection.name}” será apagada. As séries e o progresso de leitura continuam intactos.
        </p>
      </Dialog>
    </div>
  );
}

function AddSeriesDialog({
  open,
  onClose,
  collection,
}: {
  open: boolean;
  onClose: () => void;
  collection: Collection;
}) {
  const { data: all } = useSeriesList();
  const [query, setQuery] = useState('');
  const inCollection = new Set(collection.seriesIds);

  const list = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return (all ?? [])
      .filter((s) => !q || s.name.toLocaleLowerCase().includes(q))
      .sort((a, b) => naturalCompare(a.name, b.name));
  }, [all, query]);

  return (
    <Dialog open={open} onClose={onClose} title="Adicionar séries">
      <div className="relative mb-3">
        <Search className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 size-4 text-ink-300" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filtrar séries…"
          className={`${inputClass} pl-9`}
        />
      </div>
      <div className="-mx-2 max-h-80 space-y-0.5 overflow-y-auto">
        {list.map((s) => {
          const checked = inCollection.has(s.id);
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={checked}
              onClick={() => toggleSeriesInCollection(collection.id, s.id)}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-white/5"
            >
              <div className="w-8 shrink-0">
                <Cover bookId={s.coverBookId} alt="" />
              </div>
              <span className="min-w-0 flex-1 truncate text-sm">{s.name}</span>
              <span
                className={`grid size-5 shrink-0 place-items-center rounded border ${
                  checked ? 'border-ink-100 bg-ink-100 text-ink-900' : 'border-white/20'
                }`}
              >
                {checked && <Check className="size-3.5" strokeWidth={3} />}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex justify-end border-white/5 border-t pt-4">
        <Button variant="primary" onClick={onClose}>
          Pronto
        </Button>
      </div>
    </Dialog>
  );
}

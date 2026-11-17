import { Layers, Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, EmptyState, PageHeader } from '../../components/ui.tsx';
import { useCollections } from '../../db/collections.ts';
import { useSeriesMap } from '../../lib/queries.ts';
import { CollectionCard, CollectionFormDialog } from './components.tsx';

export function CollectionsPage() {
  const collections = useCollections();
  const seriesMap = useSeriesMap();
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <PageHeader
        title="Coleções"
        subtitle="Agrupe séries de qualquer biblioteca. Fixe as favoritas no Início."
        actions={
          <Button variant="primary" onClick={() => setCreating(true)}>
            <Plus className="size-4" /> Nova coleção
          </Button>
        }
      />

      {collections?.length === 0 && (
        <EmptyState icon={<Layers className="size-5" />} title="Nenhuma coleção ainda">
          Crie uma aqui ou use “Adicionar à coleção” na página de uma série.
        </EmptyState>
      )}

      <div className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {collections?.map((c) => (
          <CollectionCard key={c.id} collection={c} seriesMap={seriesMap} />
        ))}
      </div>

      <CollectionFormDialog
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={(c) => navigate(`/collections/${c.id}`)}
      />
    </div>
  );
}

import type { Collection } from '@gutter/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db.ts';

export function useCollections() {
  return useLiveQuery(() => db.collections.orderBy('updatedAt').reverse().toArray(), []);
}

/** `undefined` = carregando; `null` = não existe. */
export function useCollection(id: string | undefined) {
  return useLiveQuery(async () => (id ? ((await db.collections.get(id)) ?? null) : null), [id]);
}

/** IDs das coleções que contêm a série. */
export function useCollectionsOfSeries(seriesId: string | undefined) {
  return useLiveQuery(
    async () =>
      seriesId
        ? new Set(await db.collections.where('seriesIds').equals(seriesId).primaryKeys())
        : new Set<string>(),
    [seriesId],
    new Set<string>(),
  );
}

export async function createCollection(input: {
  name: string;
  description?: string;
  seriesIds?: string[];
}): Promise<Collection> {
  const now = Date.now();
  const collection: Collection = {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    seriesIds: input.seriesIds ?? [],
    pinned: false,
    createdAt: now,
    updatedAt: now,
  };
  const description = input.description?.trim();
  if (description) collection.description = description;
  await db.collections.add(collection);
  return collection;
}

export async function updateCollection(
  id: string,
  patch: Partial<Pick<Collection, 'name' | 'description' | 'pinned' | 'seriesIds'>>,
) {
  await db.collections.update(id, { ...patch, updatedAt: Date.now() });
}

export async function deleteCollection(id: string) {
  await db.collections.delete(id);
}

export async function toggleSeriesInCollection(collectionId: string, seriesId: string) {
  await db.transaction('rw', db.collections, async () => {
    const c = await db.collections.get(collectionId);
    if (!c) return;
    const seriesIds = c.seriesIds.includes(seriesId)
      ? c.seriesIds.filter((s) => s !== seriesId)
      : [...c.seriesIds, seriesId];
    await db.collections.update(collectionId, { seriesIds, updatedAt: Date.now() });
  });
}

/** Move a série uma posição para cima (-1) ou para baixo (+1) na coleção. */
export async function moveSeriesInCollection(
  collectionId: string,
  seriesId: string,
  delta: -1 | 1,
) {
  await db.transaction('rw', db.collections, async () => {
    const c = await db.collections.get(collectionId);
    if (!c) return;
    const i = c.seriesIds.indexOf(seriesId);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= c.seriesIds.length) return;
    const ids = [...c.seriesIds];
    [ids[i], ids[j]] = [ids[j] as string, ids[i] as string];
    await db.collections.update(collectionId, { seriesIds: ids, updatedAt: Date.now() });
  });
}

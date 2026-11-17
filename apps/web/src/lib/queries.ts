import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useSource } from '../sources/source-context.tsx';

/**
 * Hooks de dados sobre a Source ativa. As chaves incluem `source.kind`
 * para não misturar cache quando a Source mudar (mock → local → remote).
 */

export function useSeriesList() {
  const source = useSource();
  return useQuery({
    queryKey: [source.kind, 'series'],
    queryFn: ({ signal }) => source.listSeries({ signal }),
  });
}

/** Séries indexadas por id (para coleções, que guardam só ids). */
export function useSeriesMap() {
  const { data } = useSeriesList();
  return useMemo(() => new Map((data ?? []).map((s) => [s.id, s])), [data]);
}

export function useSeries(seriesId: string | undefined) {
  const source = useSource();
  return useQuery({
    queryKey: [source.kind, 'series', seriesId],
    queryFn: ({ signal }) => source.getSeries(seriesId ?? '', { signal }),
    enabled: !!seriesId,
  });
}

export function useBooks(seriesId: string | undefined) {
  const source = useSource();
  return useQuery({
    queryKey: [source.kind, 'series', seriesId, 'books'],
    queryFn: ({ signal }) => source.listBooks(seriesId ?? '', { signal }),
    enabled: !!seriesId,
  });
}

export function useBook(bookId: string | undefined) {
  const source = useSource();
  return useQuery({
    queryKey: [source.kind, 'book', bookId],
    queryFn: ({ signal }) => source.getBook(bookId ?? '', { signal }),
    enabled: !!bookId,
  });
}

export function usePages(bookId: string | undefined) {
  const source = useSource();
  return useQuery({
    queryKey: [source.kind, 'book', bookId, 'pages'],
    queryFn: ({ signal }) => source.listPages(bookId ?? '', { signal }),
    enabled: !!bookId,
  });
}

/** Capa do livro como ObjectURL, revogada ao desmontar. */
export function useThumbnailUrl(bookId: string | undefined) {
  const source = useSource();
  const { data } = useQuery({
    queryKey: [source.kind, 'book', bookId, 'thumbnail'],
    queryFn: ({ signal }) => source.getThumbnail(bookId ?? '', { signal }),
    enabled: !!bookId,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: 5 * 60_000,
  });
  return useObjectUrl(data);
}

export function useObjectUrl(blob: Blob | undefined): string | undefined {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob) return setUrl(undefined);
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}

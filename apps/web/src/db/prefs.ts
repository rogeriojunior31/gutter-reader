import {
  DEFAULT_READER_SETTINGS,
  type PageInfo,
  type ReaderSettings,
  type Series,
} from '@gutter/core';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db.ts';

const GLOBAL_KEY = 'reader.defaults';

/**
 * Resolve as configurações de leitura de uma série, em camadas:
 * padrão do app → padrão global do usuário → palpite pelo conteúdo → preferência salva da série.
 */
export function useReaderSettings(series: Series | undefined, pages: readonly PageInfo[]) {
  const stored = useLiveQuery(async () => {
    if (!series) return null;
    const [global, prefs] = await Promise.all([
      db.kv.get(GLOBAL_KEY),
      db.seriesPrefs.get(series.id),
    ]);
    return {
      global: (global?.value ?? {}) as Partial<ReaderSettings>,
      series: prefs?.settings ?? {},
    };
  }, [series?.id]);

  if (!series || !stored) return undefined;

  const guessed: Partial<ReaderSettings> = {};
  if (series.rtl) guessed.direction = 'rtl';
  if (looksLikeWebtoon(pages)) guessed.layout = 'webtoon';

  return {
    ...DEFAULT_READER_SETTINGS,
    ...stored.global,
    ...guessed,
    ...stored.series,
  } satisfies ReaderSettings;
}

export async function saveSeriesSettings(seriesId: string, settings: ReaderSettings) {
  await db.seriesPrefs.put({ seriesId, settings });
}

export async function saveGlobalSettings(settings: Partial<ReaderSettings>) {
  await db.kv.put({ key: GLOBAL_KEY, value: settings });
}

/** Padrão global já mesclado com o padrão do app. */
export function useGlobalSettings(): ReaderSettings | undefined {
  return useLiveQuery(async () => {
    const row = await db.kv.get(GLOBAL_KEY);
    return { ...DEFAULT_READER_SETTINGS, ...((row?.value ?? {}) as Partial<ReaderSettings>) };
  }, []);
}

export function useSeriesPrefsCount() {
  return useLiveQuery(() => db.seriesPrefs.count(), [], 0);
}

export async function clearSeriesPrefs() {
  await db.seriesPrefs.clear();
}

/** Mediana da proporção altura/largura acima de 2 → provavelmente webtoon. */
function looksLikeWebtoon(pages: readonly PageInfo[]): boolean {
  const ratios = pages
    .filter((p) => p.width && p.height)
    .map((p) => (p.height ?? 0) / (p.width ?? 1))
    .sort((a, b) => a - b);
  const mid = ratios[Math.floor(ratios.length / 2)];
  return mid !== undefined && mid > 2;
}

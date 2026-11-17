import { describe, expect, it } from 'vitest';
import { buildLibrary, type LocalFile } from './library.ts';

const file = (path: string, mtime = 1): LocalFile => ({
  path,
  size: 100,
  mtime,
  getFile: () => Promise.reject(new Error('não usado')),
});

// Nomes reais de uma pasta de HQs (formatos misturados, caixa e padrões diferentes).
const DK = 'Demon Knights/Demon Knights';
const files = [
  file(`${DK}/demon knights #12.2 (2012) (darkseidclub).cbz`),
  file(`${DK}/DK #20 (2013) (DarkseiDClub).cbr`, 5),
  file(`${DK}/Demon Knights #01 (2011) (DarkseidClub).cbz`),
  file(`${DK}/demon knights #12.1 (2012) (darkseidclub).cbz`),
  file(`${DK}/Demon Knights #05 (2012) (DarkseidClub).cbr`),
  file(`${DK}/Thumbs.db`),
  file('Avulsos/Watchmen (1987).pdf'),
  file('__MACOSX/Demon Knights/._x.cbz'),
];

describe('buildLibrary', () => {
  const lib = buildLibrary('DC Universe', files);

  it('agrupa por pasta e nomeia a série pela última parte do caminho', () => {
    expect(lib.series).toHaveLength(1);
    expect(lib.series[0]).toMatchObject({ name: 'Demon Knights', bookCount: 5, addedAt: 5 });
    expect(lib.series[0]?.metadata?.year).toBe(2011);
  });

  it('ordena por número de edição, com decimais', () => {
    const books = lib.booksBySeries.get(lib.series[0]?.id ?? '') ?? [];
    expect(books.map((b) => b.title)).toEqual(['#1', '#5', '#12.1', '#12.2', '#20']);
    expect(books.map((b) => b.format)).toEqual(['cbz', 'cbr', 'cbz', 'cbz', 'cbr']);
    expect(lib.series[0]?.coverBookId).toBe(books[0]?.id);
  });

  it('separa formatos ainda não suportados e ignora lixo', () => {
    expect(lib.skipped).toEqual([{ path: 'Avulsos/Watchmen (1987).pdf', format: 'pdf' }]);
    expect(lib.books.size).toBe(5);
  });

  it('ids estáveis e contagem de páginas do cache', () => {
    const again = buildLibrary('DC Universe', files);
    const id = lib.series[0]?.coverBookId ?? '';
    expect(again.books.has(id)).toBe(true);
    const withCount = buildLibrary('DC Universe', files, new Map([[id, 22]]));
    expect(withCount.books.get(id)?.pageCount).toBe(22);
  });
});

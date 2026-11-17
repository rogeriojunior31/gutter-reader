import { describe, expect, it } from 'vitest';
import {
  bookFormat,
  fnv1a64,
  isJunkPath,
  localBookHash,
  naturalSort,
  parseBookFilename,
  parseComicInfo,
} from './index.ts';

describe('naturalSort', () => {
  it('ordena 1..120 numericamente', () => {
    const names = Array.from({ length: 120 }, (_, i) => `${i + 1}.jpg`).reverse();
    const sorted = naturalSort(names, (n) => n);
    expect(sorted.slice(0, 3)).toEqual(['1.jpg', '2.jpg', '3.jpg']);
    expect(sorted.at(-1)).toBe('120.jpg');
  });

  it('considera pastas', () => {
    expect(naturalSort(['ch10/1.jpg', 'ch2/1.jpg'], (n) => n)).toEqual(['ch2/1.jpg', 'ch10/1.jpg']);
  });
});

describe('isJunkPath', () => {
  it.each([
    ['__MACOSX/._1.jpg', true],
    ['Thumbs.db', true],
    ['sub/.DS_Store', true],
    ['.hidden.jpg', true],
    ['vol\\.thumb\\1.jpg', true],
    ['001.jpg', false],
    ['vol 1/001.jpg', false],
  ])('%s -> %s', (path, junk) => expect(isJunkPath(path)).toBe(junk));
});

describe('bookFormat', () => {
  it('reconhece extensões', () => {
    expect(bookFormat('a/One Piece v01.CBZ')).toBe('cbz');
    expect(bookFormat('x.cbr')).toBe('cbr');
    expect(bookFormat('x.pdf')).toBe('pdf');
    expect(bookFormat('x.txt')).toBeUndefined();
  });
});

describe('parseComicInfo', () => {
  it('lê campos e Manga RTL', () => {
    const info = parseComicInfo(`<?xml version="1.0"?>
      <ComicInfo><Title>A &amp; B</Title><Series>Teste</Series><Number>3.5</Number>
      <PageCount>42</PageCount><Manga>YesAndRightToLeft</Manga></ComicInfo>`);
    expect(info).toEqual({
      title: 'A & B',
      series: 'Teste',
      number: 3.5,
      pageCount: 42,
      rtl: true,
    });
  });
});

describe('parseComicInfo metadados', () => {
  it('lê gêneros, autores e ano', () => {
    const info = parseComicInfo(`<ComicInfo><Genre>Ação, Drama;Ação</Genre>
      <Writer>Ana</Writer><Penciller>Bia, Caio</Penciller><Year>2021</Year>
      <Publisher>Editora X</Publisher></ComicInfo>`);
    expect(info.genres).toEqual(['Ação', 'Drama']);
    expect(info.year).toBe(2021);
    expect(info.publisher).toBe('Editora X');
    expect(info.contributors).toEqual([
      { name: 'Ana', role: 'writer' },
      { name: 'Bia', role: 'penciller' },
      { name: 'Caio', role: 'penciller' },
    ]);
  });
});

describe('ids', () => {
  it('é estável e normaliza separadores', () => {
    expect(fnv1a64('')).toBe('cbf29ce484222325');
    expect(localBookHash('a\\b.cbz', 1, 2)).toBe(localBookHash('a/b.cbz', 1, 2));
    expect(localBookHash('a/b.cbz', 1, 2)).not.toBe(localBookHash('a/b.cbz', 1, 3));
  });
});

describe('parseBookFilename', () => {
  it.each([
    ['Demon Knights #01 (2011) (DarkseidClub).cbz', '#1', 1, 2011],
    ['demon knights #09 (darkseidclub).cbz', '#9', 9, undefined],
    ['demon knights #12.1 (2012) (darkseidclub).cbz', '#12.1', 12.1, 2012],
    ['Demon Knights #16.cbz', '#16', 16, undefined],
    ['DK #20 (2013) (DarkseiDClub).cbr', '#20', 20, 2013],
    ['One Piece v03.cbz', 'Vol. 3', 3, undefined],
    ['Berserk Vol. 41 [Scan].cbr', 'Vol. 41', 41, undefined],
    ['Saga 054.cbz', '#54', 54, undefined],
  ])('%s', (name, title, number, year) => {
    const p = parseBookFilename(name);
    expect(p.title).toBe(title);
    expect(p.number).toBe(number);
    expect(p.year).toBe(year);
  });

  it('sem número usa o nome limpo', () => {
    expect(parseBookFilename('Watchmen (1987) (Absolute).cbz')).toEqual({
      title: 'Watchmen',
      year: 1987,
    });
  });
});

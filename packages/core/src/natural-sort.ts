const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/** Compara nomes de arquivo de forma natural: "2.jpg" < "10.jpg". Compara o caminho todo. */
export function naturalCompare(a: string, b: string): number {
  return collator.compare(a, b);
}

export function naturalSort<T>(items: readonly T[], key: (item: T) => string): T[] {
  return [...items].sort((a, b) => naturalCompare(key(a), key(b)));
}

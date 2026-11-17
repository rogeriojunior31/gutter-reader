/** FNV-1a 64 bits. Rápido, síncrono e estável entre plataformas (não é criptográfico). */
export function fnv1a64(input: string): string {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const bytes = new TextEncoder().encode(input);
  for (const b of bytes) {
    hash ^= BigInt(b);
    hash = BigInt.asUintN(64, hash * prime);
  }
  return hash.toString(16).padStart(16, '0');
}

/** ID estável de um livro local: hash(caminho + tamanho + mtime). */
export function localBookHash(path: string, size: number, mtime: number): string {
  const normalized = path.replaceAll('\\', '/');
  return fnv1a64([normalized, size, mtime].join('|'));
}

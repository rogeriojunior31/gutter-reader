import { bookFormat, isJunkPath } from '@gutter/core';
import type { LocalFile } from './library.ts';

/** Percorre a pasta escolhida (File System Access API) e coleta os arquivos de livro. */
export async function filesFromDirectory(root: FileSystemDirectoryHandle): Promise<LocalFile[]> {
  const out: LocalFile[] = [];

  async function walk(dir: FileSystemDirectoryHandle, prefix: string): Promise<void> {
    const subdirs: Promise<void>[] = [];
    for await (const handle of dir.values()) {
      const path = prefix ? `${prefix}/${handle.name}` : handle.name;
      if (isJunkPath(path)) continue;
      if (handle.kind === 'directory') {
        subdirs.push(walk(handle as FileSystemDirectoryHandle, path));
      } else if (bookFormat(path)) {
        const fileHandle = handle as FileSystemFileHandle;
        const file = await fileHandle.getFile();
        out.push({
          path,
          size: file.size,
          mtime: file.lastModified,
          getFile: () => fileHandle.getFile(),
        });
      }
    }
    await Promise.all(subdirs);
  }

  await walk(root, '');
  return out;
}

/** Fallback (<input webkitdirectory>): o navegador já entregou todos os File. */
export function filesFromInput(list: FileList): { rootName: string; files: LocalFile[] } {
  const files: LocalFile[] = [];
  let rootName = 'Pasta';
  for (const file of Array.from(list)) {
    // webkitRelativePath = "Raiz/sub/arquivo.cbz"; tiramos a raiz.
    const rel = file.webkitRelativePath || file.name;
    const [first, ...rest] = rel.split('/');
    if (first && rest.length) rootName = first;
    const path = rest.length ? rest.join('/') : rel;
    if (isJunkPath(path) || !bookFormat(path)) continue;
    files.push({ path, size: file.size, mtime: file.lastModified, getFile: async () => file });
  }
  return { rootName, files };
}

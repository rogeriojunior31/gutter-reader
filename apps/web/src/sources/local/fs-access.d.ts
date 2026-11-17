// Partes da File System Access API (Chromium) que não estão no lib.dom padrão.
// https://wicg.github.io/file-system-access/

type FileSystemPermissionMode = 'read' | 'readwrite';

interface FileSystemHandle {
  queryPermission?(descriptor?: { mode?: FileSystemPermissionMode }): Promise<PermissionState>;
  requestPermission?(descriptor?: { mode?: FileSystemPermissionMode }): Promise<PermissionState>;
}

interface Window {
  showDirectoryPicker?(options?: {
    id?: string;
    mode?: FileSystemPermissionMode;
    startIn?: string;
  }): Promise<FileSystemDirectoryHandle>;
}

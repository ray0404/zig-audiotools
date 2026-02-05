/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface Window {
  showSaveFilePicker(options?: any): Promise<FileSystemFileHandle>;
  showOpenFilePicker(options?: any): Promise<FileSystemFileHandle[]>;
}

interface FileSystemFileHandle {
  kind: 'file';
  name: string;
  createWritable(options?: any): Promise<FileSystemWritableFileStream>;
  getFile(): Promise<File>;
}

interface FileSystemWritableFileStream extends WritableStream {
  write(data: any): Promise<void>;
  close(): Promise<void>;
}

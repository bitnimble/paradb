import { FileEntry, configure } from '@zip.js/zip.js';

// There are no web workers on the server, and inflating a map's metadata doesn't need them anyway.
configure({ useWebWorkers: false });

export async function readEntry(entry: FileEntry): Promise<Buffer> {
  return Buffer.from(await entry.arrayBuffer());
}

// Zip entry names always use '/', regardless of the platform the archive was built on, so the
// `path` equivalents would be wrong on Windows.
export function zipBasename(filename: string): string {
  return filename.substring(filename.lastIndexOf('/') + 1);
}

export function zipDirname(filename: string): string {
  const separator = filename.lastIndexOf('/');
  return separator === -1 ? '.' : filename.substring(0, separator);
}

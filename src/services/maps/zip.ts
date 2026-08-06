import { FileEntry, Reader, configure } from '@zip.js/zip.js';

// There are no web workers on the server, and inflating a map's metadata doesn't need them anyway.
configure({ useWebWorkers: false });

/** A zip.js `Reader` over data whose ranges are expensive to fetch: a remote object, a file on disk. */
export abstract class RangeReader extends Reader<string> {
  // The central directory sits immediately before the end-of-central-directory record, so caching
  // the tail covers both in one fetch. Only the tail: an entry's data can be arbitrarily large.
  private tail?: { index: number; bytes: Uint8Array };

  constructor(name: string, size: number) {
    super(name);
    this.size = size;
  }

  protected abstract fetchRange(index: number, length: number): Promise<Uint8Array>;

  async readUint8Array(index: number, length: number): Promise<Uint8Array> {
    const available = Math.min(length, this.size - index);
    if (available <= 0) {
      return new Uint8Array(0);
    }
    const tail = this.tail;
    if (
      tail != null &&
      index >= tail.index &&
      index + available <= tail.index + tail.bytes.length
    ) {
      const start = index - tail.index;
      return tail.bytes.subarray(start, start + available);
    }
    // zip.js reads records out of what it's handed with `slice()`, relying on it copying. A Buffer
    // - which is what both the S3 client and `fs` hand back - slices to a view over a shared pool
    // instead, losing the offset, and the parser then reads from the wrong place entirely.
    const fetched = await this.fetchRange(index, available);
    const bytes = new Uint8Array(fetched.buffer, fetched.byteOffset, fetched.byteLength);
    if (index + bytes.length >= this.size) {
      this.tail = { index, bytes };
    }
    return bytes;
  }
}

export async function readEntry(entry: FileEntry): Promise<Uint8Array> {
  return new Uint8Array(await entry.arrayBuffer());
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

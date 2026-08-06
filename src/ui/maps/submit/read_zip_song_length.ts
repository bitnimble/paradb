// The `-native` build inflates with the browser's own DecompressionStream instead of bundling a
// deflate implementation, which is ~14KB gzipped less to ship.
import {
  BlobReader,
  FileEntry,
  Uint8ArrayWriter,
  ZipReader,
  configure,
} from '@zip.js/zip.js/lib/zip-core-native.js';
import { parseRlrr, rlrrSongLength } from 'services/maps/rlrr';

// A worker would mean a blob-URL worker, and the CSP allowance for it, to inflate a few KB.
configure({ useWebWorkers: false });

/**
 * Longest song the archive's rlrr files declare, in seconds, or undefined if it can't be read as a
 * map. Only the central directory and the rlrr files are fetched, so a large archive stays cheap.
 *
 * Advisory: the server reads the length itself rather than trusting anything derived here.
 */
export async function readZipSongLength(zip: Blob): Promise<number | undefined> {
  try {
    const entries = await new ZipReader(new BlobReader(zip)).getEntries();
    const rlrrs = entries.filter(
      (e): e is FileEntry => !e.directory && e.filename.endsWith('.rlrr')
    );
    const lengths = await Promise.all(rlrrs.map(readSongLength));
    // Max, matching the server: difficulties recorded separately can disagree slightly, and the
    // longest is the one the budget has to cover.
    const declared = lengths.filter((l): l is number => l != null);
    return declared.length === 0 ? undefined : Math.max(...declared);
  } catch {
    return undefined;
  }
}

async function readSongLength(entry: FileEntry): Promise<number | undefined> {
  return rlrrSongLength(parseRlrr(await entry.getData(new Uint8ArrayWriter())));
}

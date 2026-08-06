// The `-native` build inflates with the browser's own DecompressionStream instead of bundling a
// deflate implementation, which is ~14KB gzipped less to ship.
import {
  BlobReader,
  FileEntry,
  Uint8ArrayWriter,
  ZipReader,
  configure,
} from '@zip.js/zip.js/lib/zip-core-native.js';
import { longestSongLength } from 'services/maps/map_size';
import { parseRlrr, rlrrSongLength } from 'services/maps/rlrr';

// A worker would mean a blob-URL worker, and the CSP allowance for it, to inflate a few KB.
configure({ useWebWorkers: false });

/**
 * Longest song the archive's rlrr files declare, in seconds, or undefined if it can't be read as a
 * map.
 *
 * Advisory: the server reads the length itself rather than trusting anything derived here.
 */
export async function readZipSongLength(zip: Blob): Promise<number | undefined> {
  try {
    // Only the central directory and the rlrr entries get read, so a large archive stays cheap.
    const entries = await new ZipReader(new BlobReader(zip)).getEntries();
    const rlrrs = entries.filter(
      (e): e is FileEntry => !e.directory && e.filename.endsWith('.rlrr')
    );
    // One unreadable difficulty shouldn't cost the check on the others.
    const lengths = await Promise.all(rlrrs.map((e) => entrySongLength(e).catch(() => undefined)));
    return longestSongLength(lengths);
  } catch {
    return undefined;
  }
}

async function entrySongLength(entry: FileEntry): Promise<number | undefined> {
  return rlrrSongLength(parseRlrr(await entry.getData(new Uint8ArrayWriter())));
}

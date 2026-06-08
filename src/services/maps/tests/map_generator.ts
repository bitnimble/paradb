import * as fs from 'fs';
import * as path from 'path';

/**
 * Programmatically builds valid Paradiddle map zips for tests, porting the Python generator that
 * used to live in `e2e/fixtures/README.md`. A built zip carries controlled `recordingMetadata`
 * (title/artist/creator/description/complexity) so tests can drive search, filtering and pagination
 * from known values. The audio tracks and album art are reused from the committed fixtures under
 * `files/` (`silence.ogg`, `album.jpg`), same as the Python script.
 */

const FILES_DIR = path.resolve(__dirname, 'files');
const albumArt = fs.readFileSync(path.join(FILES_DIR, 'album.jpg'));
const silence = fs.readFileSync(path.join(FILES_DIR, 'silence.ogg'));

export type MapZipSpec = {
  /** Top-level folder name. Must match the .rlrr filename prefix, which the validator enforces. */
  folder: string;
  difficulty?: string;
  title: string;
  artist: string;
  creator?: string;
  description?: string;
  complexity?: number;
};

export function buildMapZip(spec: MapZipSpec): Buffer {
  const difficulty = spec.difficulty ?? 'Easy';
  const rlrr = {
    version: 0.6,
    recordingMetadata: {
      title: spec.title,
      description: spec.description ?? '',
      coverImagePath: 'album.jpg',
      artist: spec.artist,
      creator: spec.creator ?? '',
      length: 11.1814,
      complexity: spec.complexity ?? 1,
    },
    audioFileData: { songTracks: ['song.ogg'], drumTracks: ['drums.ogg'], calibrationOffset: 0.0 },
    instruments: [],
    events: [],
    bpmEvents: [{ bpm: 120.0, time: 0.0 }],
  };

  // The .rlrr must come first: the validator derives the map name from the first file entry.
  return buildZip([
    {
      name: `${spec.folder}/${spec.folder}_${difficulty}.rlrr`,
      data: Buffer.from(JSON.stringify(rlrr, null, 2)),
    },
    { name: `${spec.folder}/album.jpg`, data: albumArt },
    { name: `${spec.folder}/song.ogg`, data: silence },
    { name: `${spec.folder}/drums.ogg`, data: silence },
  ]);
}

type ZipEntry = { name: string; data: Buffer };

// Minimal STORED (uncompressed) zip writer. STORED keeps this dependency-free, and `unzipper` (the
// reader the validator uses) handles it; compression buys nothing for tiny test fixtures.
function buildZip(entries: ZipEntry[]): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name, 'utf8');
    const crc = crc32(entry.data);
    const size = entry.data.length;

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0); // local file header signature
    local.writeUInt16LE(20, 4); // version needed to extract
    local.writeUInt16LE(0, 6); // flags
    local.writeUInt16LE(0, 8); // compression method: stored
    local.writeUInt16LE(0, 10); // mod time
    local.writeUInt16LE(0, 12); // mod date
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(size, 18); // compressed size
    local.writeUInt32LE(size, 22); // uncompressed size
    local.writeUInt16LE(nameBuf.length, 26);
    local.writeUInt16LE(0, 28); // extra field length
    localParts.push(local, nameBuf, entry.data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0); // central directory header signature
    central.writeUInt16LE(20, 4); // version made by
    central.writeUInt16LE(20, 6); // version needed to extract
    central.writeUInt16LE(0, 8); // flags
    central.writeUInt16LE(0, 10); // compression method
    central.writeUInt16LE(0, 12); // mod time
    central.writeUInt16LE(0, 14); // mod date
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(size, 20); // compressed size
    central.writeUInt32LE(size, 24); // uncompressed size
    central.writeUInt16LE(nameBuf.length, 28);
    central.writeUInt16LE(0, 30); // extra field length
    central.writeUInt16LE(0, 32); // comment length
    central.writeUInt16LE(0, 34); // disk number start
    central.writeUInt16LE(0, 36); // internal attributes
    central.writeUInt32LE(0, 38); // external attributes
    central.writeUInt32LE(offset, 42); // relative offset of local header
    centralParts.push(central, nameBuf);

    offset += local.length + nameBuf.length + entry.data.length;
  }

  const localBuf = Buffer.concat(localParts);
  const centralBuf = Buffer.concat(centralParts);

  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); // end of central directory signature
  end.writeUInt16LE(0, 4); // disk number
  end.writeUInt16LE(0, 6); // disk with central directory
  end.writeUInt16LE(entries.length, 8); // central directory entries on this disk
  end.writeUInt16LE(entries.length, 10); // total central directory entries
  end.writeUInt32LE(centralBuf.length, 12); // size of central directory
  end.writeUInt32LE(localBuf.length, 16); // offset of central directory
  end.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([localBuf, centralBuf, end]);
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

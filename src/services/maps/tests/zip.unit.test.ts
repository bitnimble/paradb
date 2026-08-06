import { ZipReader } from '@zip.js/zip.js';
import { RangeReader } from 'services/maps/zip';
import { buildMapZip } from './map_generator';

class FakeRangeReader extends RangeReader {
  readonly fetches: { index: number; length: number }[] = [];

  constructor(private readonly data: Buffer) {
    super('fake', data.byteLength);
  }

  // Deliberately a Buffer view at a non-zero offset, which is what both the S3 client and `fs`
  // hand back, so a lost byte offset shows up here rather than in production.
  protected async fetchRange(index: number, length: number): Promise<Uint8Array> {
    this.fetches.push({ index, length });
    return this.data.subarray(index, index + length);
  }
}

const data = Buffer.from(Array.from({ length: 1000 }, (_, i) => i % 256));

describe('RangeReader', () => {
  it('serves reads contained in the cached tail without fetching again', async () => {
    const reader = new FakeRangeReader(data);

    const tail = await reader.readUint8Array(900, 100);
    const withinTail = await reader.readUint8Array(950, 10);

    expect(reader.fetches).toEqual([{ index: 900, length: 100 }]);
    expect(tail).toEqual(Uint8Array.from(data.subarray(900)));
    expect(withinTail).toEqual(Uint8Array.from(data.subarray(950, 960)));
  });

  it('fetches reads that fall outside the cached tail', async () => {
    const reader = new FakeRangeReader(data);

    await reader.readUint8Array(900, 100);
    await reader.readUint8Array(0, 30);
    // Straddling the start of the tail isn't served from it either.
    await reader.readUint8Array(890, 20);

    expect(reader.fetches).toEqual([
      { index: 900, length: 100 },
      { index: 0, length: 30 },
      { index: 890, length: 20 },
    ]);
  });

  it('does not cache a read that stops short of the end', async () => {
    const reader = new FakeRangeReader(data);

    await reader.readUint8Array(500, 100);
    await reader.readUint8Array(550, 10);

    expect(reader.fetches).toHaveLength(2);
  });

  it('truncates a read that runs past the end, and never fetches past it', async () => {
    const reader = new FakeRangeReader(data);

    const bytes = await reader.readUint8Array(990, 100);

    expect(bytes).toEqual(Uint8Array.from(data.subarray(990)));
    expect(reader.fetches).toEqual([{ index: 990, length: 10 }]);
    expect(await reader.readUint8Array(1000, 10)).toEqual(new Uint8Array(0));
  });

  it('reads a real archive: central directory and end record in one fetch', async () => {
    const zip = buildMapZip({
      folder: 'Test',
      title: 'Test',
      artist: 'Artist',
      padBytes: 1024 * 1024,
    });
    const reader = new FakeRangeReader(zip);

    const entries = await new ZipReader(reader).getEntries();

    expect(entries.length).toBeGreaterThan(0);
    expect(reader.fetches).toHaveLength(1);
  });
});

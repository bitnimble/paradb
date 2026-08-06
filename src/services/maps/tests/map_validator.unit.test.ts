import { Reader, Uint8ArrayReader } from '@zip.js/zip.js';
import * as fs from 'fs';
import * as path from 'path';
import { validateMap } from 'services/maps/map_validator';
import { readEntry } from 'services/maps/zip';
import { buildMapZip } from './map_generator';

class FailingReader extends Reader<Uint8Array> {
  private reads = 0;
  private readonly delegate: Uint8ArrayReader;

  constructor(
    data: Uint8Array,
    private readonly failAfterReads: number
  ) {
    super(data);
    this.delegate = new Uint8ArrayReader(data);
    this.size = data.byteLength;
  }

  async readUint8Array(index: number, length: number): Promise<Uint8Array> {
    if (this.reads++ >= this.failAfterReads) {
      throw new Error('storage unavailable');
    }
    return this.delegate.readUint8Array(index, length);
  }
}

class CountingReader extends Reader<Uint8Array> {
  bytesRead = 0;
  private readonly delegate: Uint8ArrayReader;

  constructor(data: Uint8Array) {
    super(data);
    this.delegate = new Uint8ArrayReader(data);
    this.size = data.byteLength;
  }

  async init(): Promise<void> {
    await this.delegate.init?.();
  }

  async readUint8Array(index: number, length: number): Promise<Uint8Array> {
    this.bytesRead += length;
    return this.delegate.readUint8Array(index, length);
  }
}

const readFixture = (name: string) => fs.readFileSync(path.resolve(__dirname, 'files', name));

const validate = (name: string) =>
  validateMap({ id: 'test', reader: new Uint8ArrayReader(readFixture(name)) });

const expectError = async (name: string, type: string) => {
  const result = await validate(name);
  expect(result.success).toBe(false);
  expect((result as Extract<typeof result, { success: false }>).errors[0].type).toEqual(type);
};

describe('validateMap', () => {
  describe('accepts valid maps', () => {
    it('a standard valid map', async () => {
      const result = await validate('Test_valid.zip');
      expect(result.success).toBe(true);
      const value = (result as Extract<typeof result, { success: true }>).value;
      expect(value.title).toEqual('Test');
      expect(value.difficulties.length).toBeGreaterThan(0);
    });

    it('a second valid map', async () => {
      const result = await validate('Test_valid2.zip');
      expect(result.success).toBe(true);
    });

    it('a valid map whose folder name matches the rlrr files', async () => {
      const result = await validate('Test_valid_different_folder_name.zip');
      expect(result.success).toBe(true);
    });

    // The album art entries outlive the call, and are only read later, when they're uploaded to S3.
    it('returns album art entries that are still readable afterwards', async () => {
      const result = await validate('Test_valid.zip');
      const { albumArtFiles } = (result as Extract<typeof result, { success: true }>).value;
      expect(albumArtFiles.length).toBeGreaterThan(0);

      const bytes = await readEntry(albumArtFiles[0]);
      // JPEG start-of-image marker: the entry decompressed to the real album art.
      expect([bytes[0], bytes[1]]).toEqual([0xff, 0xd8]);
    });

    // Validated off the central directory and rlrr files alone, so storage never hands over the
    // audio. Bounded by zip.js' fixed-size central directory scan, not by the archive.
    it('reads a bounded amount regardless of how large the archive is', async () => {
      const build = (padBytes: number) =>
        buildMapZip({ folder: 'Test', title: 'Test', artist: 'Artist', padBytes });

      const readCounts = await Promise.all(
        [8 * 1024 * 1024, 32 * 1024 * 1024].map(async (padBytes) => {
          const buffer = build(padBytes);
          const reader = new CountingReader(buffer);
          const result = await validateMap({ id: 'test', reader });
          expect(result.success).toBe(true);
          return reader.bytesRead;
        })
      );

      expect(readCounts[0]).toEqual(readCounts[1]);
      // The scan window is ~64KB; anything beyond that means entry contents are being read.
      expect(readCounts[0]).toBeLessThan(128 * 1024);
    });
  });

  describe('rejects invalid maps', () => {
    it('a corrupted or unsupported archive', async () => {
      await expectError('Test_invalid_archive.zip', 'no_data');
    });

    it('files not contained in a single top-level folder', async () => {
      await expectError('Test_missing_folder.zip', 'incorrect_folder_structure');
    });

    it('a folder name that does not match the rlrr files', async () => {
      await expectError('Test_incorrect_folder_name.zip', 'incorrect_folder_name');
    });

    it('no rlrr files', async () => {
      await expectError('Test_missing_rlrr.zip', 'no_data');
    });

    it('a corrupted or incorrectly formatted rlrr file', async () => {
      await expectError('Test_invalid_rlrr.zip', 'invalid_format');
    });

    it('a missing required metadata field', async () => {
      await expectError('Test_missing_title.zip', 'missing_values');
    });

    it('a missing drum audio track', async () => {
      await expectError('Test_missing_audio_drums.zip', 'no_audio');
    });

    it('a missing song audio track', async () => {
      await expectError('Test_missing_audio_song.zip', 'no_audio');
    });

    it('mismatched metadata between difficulties', async () => {
      await expectError('Test_different_metadata.zip', 'mismatched_difficulty_metadata');
    });

    it('a missing album art file', async () => {
      await expectError('Test_missing_album_art.zip', 'missing_album_art');
    });

    // Storage can fail partway through, once the archive is being read entry by entry. That has to
    // come back as an error Result: a throw escaping here strands the upload mid-validation,
    // because it's only rolled back on an error Result.
    it('storage failing partway through reading the archive', async () => {
      const buffer = readFixture('Test_valid.zip');
      // The central directory is read first; the failure lands on an entry's contents.
      const reader = new FailingReader(buffer, 2);

      const result = await validateMap({ id: 'test', reader });

      expect(result.success).toBe(false);
      expect((result as Extract<typeof result, { success: false }>).errors[0].type).toEqual(
        'no_data'
      );
    });
  });
});

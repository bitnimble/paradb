import * as fs from 'fs';
import * as path from 'path';
import { FILES_DIR, buildMapZip } from 'services/maps/tests/map_generator';
import { readZipSongLength } from 'ui/maps/submit/read_zip_song_length';

describe('readZipSongLength', () => {
  // The committed fixture's rlrr is DEFLATE-compressed, unlike the generated ones.
  it('reads the length from a real, deflated archive', async () => {
    const zip = new Blob([fs.readFileSync(path.join(FILES_DIR, 'Test_valid.zip'))]);

    expect(await readZipSongLength(zip)).toEqual(11.1814);
  });

  it('takes the longest length across difficulties, as the server does', async () => {
    const zip = new Blob([
      buildMapZip({
        folder: 'Test',
        title: 'Test',
        artist: 'Artist',
        difficulties: [
          { name: 'Easy', lengthSeconds: 213.5 },
          { name: 'Hard', lengthSeconds: 214.25 },
        ],
      }),
    ]);

    expect(await readZipSongLength(zip)).toEqual(214.25);
  });

  it('reads a UTF-16LE rlrr', async () => {
    const zip = new Blob([
      buildMapZip({
        folder: 'Test',
        title: 'Test',
        artist: 'Artist',
        difficulties: [{ name: 'Easy', lengthSeconds: 42 }],
        utf16le: true,
      }),
    ]);

    expect(await readZipSongLength(zip)).toEqual(42);
  });

  it('returns undefined for something that is not a map archive', async () => {
    expect(await readZipSongLength(new Blob(['not a zip']))).toBeUndefined();
  });
});

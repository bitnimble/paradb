import { Uint8ArrayReader } from '@zip.js/zip.js';
import { maxMapFileSize } from 'services/maps/map_size';
import { validateMap } from 'services/maps/map_validator';
import { MapZipSpec, buildMapZip } from 'services/maps/tests/map_generator';
import { readZipSongLength } from 'ui/maps/submit/read_zip_song_length';

/**
 * The client decides before uploading whether an archive fits its budget, and the server decides
 * again afterwards. They read the length by different routes, so this pins them to the same verdict
 * - a disagreement means either a wasted upload or a valid map the client refuses to send.
 */
const verdicts = async (spec: MapZipSpec) => {
  const zip = buildMapZip(spec);

  const clientAccepts = zip.byteLength <= maxMapFileSize(await readZipSongLength(new Blob([zip])));
  const server = await validateMap({
    id: 'test',
    archive: { reader: new Uint8ArrayReader(zip), size: zip.byteLength },
  });

  return { clientAccepts, serverAccepts: server.success };
};

const base = { folder: 'Test', title: 'Test', artist: 'Artist' };

describe('client and server agree on the size budget', () => {
  it('for an archive inside its budget', async () => {
    const { clientAccepts, serverAccepts } = await verdicts({
      ...base,
      difficulties: [{ name: 'Easy', lengthSeconds: 60 }],
      padBytes: 40 * 1024 * 1024,
    });

    expect(clientAccepts).toBe(true);
    expect(serverAccepts).toBe(true);
  });

  it('for an archive over its budget', async () => {
    const { clientAccepts, serverAccepts } = await verdicts({
      ...base,
      difficulties: [{ name: 'Easy', lengthSeconds: 60 }],
      padBytes: 90 * 1024 * 1024,
    });

    expect(clientAccepts).toBe(false);
    expect(serverAccepts).toBe(false);
  });

  it('for difficulties whose declared lengths differ', async () => {
    const { clientAccepts, serverAccepts } = await verdicts({
      ...base,
      difficulties: [
        { name: 'Easy', lengthSeconds: 30 },
        { name: 'Hard', lengthSeconds: 600 },
      ],
      padBytes: 90 * 1024 * 1024,
    });

    expect(clientAccepts).toBe(true);
    expect(serverAccepts).toBe(true);
  });

  it('for a map that declares no length', async () => {
    const { clientAccepts, serverAccepts } = await verdicts({
      ...base,
      difficulties: [{ name: 'Easy', lengthSeconds: null }],
      padBytes: 90 * 1024 * 1024,
    });

    expect(clientAccepts).toBe(true);
    expect(serverAccepts).toBe(true);
  });
});

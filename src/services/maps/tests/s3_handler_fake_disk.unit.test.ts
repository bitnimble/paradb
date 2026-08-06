import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { validateMap } from 'services/maps/map_validator';
import { FileFakeS3Handler } from 'services/maps/s3_handler_fake_disk';
import { buildMapZip } from './map_generator';

let root: string;

beforeAll(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'paradb-dev-s3-'));
  process.env.DEV_S3_ROOT = root;
});

afterAll(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe('FileFakeS3Handler', () => {
  it('opens a stored archive for ranged reads', async () => {
    const zip = buildMapZip({
      folder: 'Test',
      title: 'Test',
      artist: 'Artist',
      padBytes: 2 * 1024 * 1024,
    });
    await fs.mkdir(path.join(root, 'maps'), { recursive: true });
    await fs.writeFile(path.join(root, 'maps', 'abc.zip.temp'), zip);

    const opened = await new FileFakeS3Handler().openMapFile('abc', true);

    expect(opened.success).toBe(true);
    const archive = (opened as Extract<typeof opened, { success: true }>).value;
    expect(archive.size).toEqual(zip.byteLength);
    // Reading through the reader is what exercises the ranged file reads.
    const result = await validateMap({ id: 'abc', archive });
    expect(result.success).toBe(true);
  });

  it('reports a missing archive rather than throwing', async () => {
    const opened = await new FileFakeS3Handler().openMapFile('nonexistent', true);

    expect(opened.success).toBe(false);
  });
});

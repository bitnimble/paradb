import { GetObjectCommand, GetObjectCommandOutput } from '@aws-sdk/client-s3';
import { ZipReader } from '@zip.js/zip.js';
import { RangeGetter, S3RangeReader } from 'services/maps/s3_handler';
import { buildMapZip } from './map_generator';

class FakeS3 implements RangeGetter {
  readonly ranges: (string | undefined)[] = [];

  constructor(private readonly object: Buffer) {}

  async send(command: GetObjectCommand): Promise<GetObjectCommandOutput> {
    const range = command.input.Range;
    this.ranges.push(range);
    const [start, end] = (range ?? '').replace('bytes=', '').split('-').map(Number);
    // S3 serves a range inclusive of both ends, and clamps one running past the object.
    const bytes = this.object.subarray(start, Math.min(end + 1, this.object.byteLength));
    return {
      Body: { transformToByteArray: async () => bytes },
    } as unknown as GetObjectCommandOutput;
  }
}

const zip = buildMapZip({ folder: 'Test', title: 'Test', artist: 'Artist' });

describe('S3RangeReader', () => {
  it('requests ranges that are inclusive of the last byte', async () => {
    const s3 = new FakeS3(zip);
    const reader = new S3RangeReader(s3, 'bucket', 'key', zip.byteLength);

    await reader.readUint8Array(10, 100);

    expect(s3.ranges).toEqual(['bytes=10-109']);
  });

  it('reads an archive that S3 only ever serves in ranges', async () => {
    const s3 = new FakeS3(zip);
    const reader = new S3RangeReader(s3, 'bucket', 'key', zip.byteLength);

    const entries = await new ZipReader(reader).getEntries();
    const rlrr = entries.find((e) => e.filename.endsWith('.rlrr'));
    const contents = await (rlrr as Extract<typeof rlrr, { directory: false }>).arrayBuffer();

    expect(entries.map((e) => e.filename)).toContain('Test/Test_Easy.rlrr');
    expect(JSON.parse(Buffer.from(contents).toString()).recordingMetadata.title).toEqual('Test');
  });

  it('throws when S3 returns no body', async () => {
    const s3 = { send: async () => ({}) as GetObjectCommandOutput };
    const reader = new S3RangeReader(s3, 'bucket', 'key', 100);

    await expect(reader.readUint8Array(0, 10)).rejects.toThrow('Missing S3 body for key');
  });
});

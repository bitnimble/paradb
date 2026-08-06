import { expect } from '@playwright/test';
import { FileEntry, Uint8ArrayReader, ZipReader } from '@zip.js/zip.js';
import { MapFixture } from '../fixtures';

/**
 * Asserts a downloaded map zip is the one we uploaded: it opens as a valid archive, contains every
 * expected file entry, and its .rlrr still carries the fixture's title. The download path stores and
 * serves the uploaded bytes verbatim, so this round-trips the whole upload -> S3 -> download flow.
 */
export async function assertZipMatchesFixture(
  zipBuffer: Buffer,
  fixture: MapFixture
): Promise<void> {
  const entries = await new ZipReader(new Uint8ArrayReader(zipBuffer)).getEntries();
  const files = entries.filter((e): e is FileEntry => !e.directory);
  const filenames = files.map((f) => f.filename);

  for (const entry of fixture.expectedEntries) {
    expect(filenames, `downloaded zip should contain ${entry}`).toContain(entry);
  }

  const rlrr = files.find((f) => f.filename.endsWith('.rlrr'));
  expect(rlrr, 'downloaded zip should contain a .rlrr').toBeTruthy();
  const metadata = JSON.parse(Buffer.from(await rlrr!.arrayBuffer()).toString());
  expect(metadata.recordingMetadata.title).toBe(fixture.title);
}

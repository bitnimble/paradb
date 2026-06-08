import { expect } from '@playwright/test';
import * as unzipper from 'unzipper';
import { MapFixture } from '../fixtures';

/**
 * Asserts a downloaded map zip is the one we uploaded: it opens as a valid archive, contains every
 * expected file entry, and its .rlrr still carries the fixture's title. The download path stores and
 * serves the uploaded bytes verbatim, so this round-trips the whole upload -> S3 -> download flow.
 */
export async function assertZipMatchesFixture(zipBuffer: Buffer, fixture: MapFixture) {
  const directory = await unzipper.Open.buffer(zipBuffer);
  const filePaths = directory.files.filter((f) => f.type === 'File').map((f) => f.path);

  for (const entry of fixture.expectedEntries) {
    expect(filePaths, `downloaded zip should contain ${entry}`).toContain(entry);
  }

  const rlrr = directory.files.find((f) => f.path.endsWith('.rlrr'));
  expect(rlrr, 'downloaded zip should contain a .rlrr').toBeTruthy();
  const metadata = JSON.parse((await rlrr!.buffer()).toString());
  expect(metadata.recordingMetadata.title).toBe(fixture.title);
}

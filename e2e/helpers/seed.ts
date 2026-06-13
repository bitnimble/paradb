import { Page } from '@playwright/test';
import { buildMapZip } from '../../src/services/maps/tests/map_generator';

// Seeds maps through the real submit flow over HTTP (presigned PUT to S3 + server-side validation +
// publish), rather than writing rows directly: it's slower than a raw insert but goes through the
// exact code path production does, so it can't drift from the schema the way hand-written SQL can.
// Uses `page.request` so it shares the (authenticated) browser context's cookies; the caller must
// have logged the page in first.

export type SeededMap = { id: string; title: string };

/**
 * Uploads `count` valid maps, all under one (caller-supplied, run-unique) artist so a search for it
 * isolates exactly this run's maps. Returns the published map ids.
 */
export async function seedPublicMaps(
  page: Page,
  opts: { artist: string; count: number }
): Promise<SeededMap[]> {
  const { artist, count } = opts;
  const maps: SeededMap[] = [];
  for (let i = 0; i < count; i++) {
    const n = String(i).padStart(3, '0');
    const title = `Infinite Scroll Map ${n}`;
    const zip = buildMapZip({ folder: `IScroll${n}`, title, artist });

    // 1. Reserve a map id + presigned S3 upload URL.
    const submit = await page.request.post('/api/maps/submit', { data: { title: `${title}.zip` } });
    const submitBody = await submit.json();
    if (!submitBody.success) {
      throw new Error(`submit failed for "${title}": ${submitBody.errorMessage}`);
    }
    const { id, url } = submitBody as { id: string; url: string };

    // 2. Upload the archive to the presigned URL (real S3 / Minio).
    const put = await page.request.put(url, {
      data: zip,
      headers: { 'Content-Type': 'application/zip' },
    });
    if (!put.ok()) {
      throw new Error(`S3 upload failed for "${title}": ${put.status()}`);
    }

    // 3. Validate + publish.
    const complete = await page.request.post('/api/maps/submit/complete', {
      data: { id, isReupload: false },
    });
    const completeBody = await complete.json();
    if (!completeBody.success) {
      throw new Error(`complete failed for "${title}": ${completeBody.errorMessage}`);
    }
    maps.push({ id, title });
  }
  return maps;
}

/** Deletes the seeded maps via the real delete endpoint (cascades difficulties/favorites + S3). */
export async function deleteSeededMaps(page: Page, ids: string[]): Promise<void> {
  for (const id of ids) {
    await page.request.post(`/api/maps/${id}/delete`);
  }
}

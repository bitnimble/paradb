import { reportUploadComplete } from 'app/api/maps/submit/complete/actions';
import { _unwrap } from 'base/result';
import { MapVisibility } from 'schema/maps';
import { MemoryFakeS3Handler } from 'services/maps/s3_handler_fake_memory';
import { getServerContext } from 'services/server_context';
import { _setCurrentUserForTesting } from 'services/session/supabase_fake';
import { buildMapZip } from './map_generator';

// `maps.uploader` has no FK, so this id only has to match the session we install below.
const UPLOADER = { id: 'UPLOAD1', email: 'uploader@test.com' };

const TOTAL = 100;
const PAGE = 20;

// Generates a map zip, seeds it into the fake S3 store, and drives the real completion flow that
// validates and publishes it (same path as maps.test.ts). Returns the published map id.
async function uploadGeneratedMap(index: number): Promise<string> {
  const n = String(index).padStart(3, '0');
  const { mapsRepo, s3Handler } = await getServerContext();
  const id = (await _unwrap(mapsRepo.createNewMap({ title: 'placeholder', uploader: UPLOADER.id })))
    .id;
  // Zero-padded title/artist so lexical ordering matches numeric ordering, giving a unique total
  // order to assert pagination against.
  const zip = buildMapZip({
    folder: `PMap${n}`,
    title: `Pagination Map ${n}`,
    artist: `Artist ${n}`,
  });
  (s3Handler as MemoryFakeS3Handler)._putMapFileForTesting(id, zip);
  _setCurrentUserForTesting({ id: UPLOADER.id, email: UPLOADER.email });
  const result = await reportUploadComplete(id, false);
  if (!result.success) {
    throw new Error(`Failed to publish generated map ${n}: ${result.errorMessage}`);
  }
  return result.value.id;
}

async function page(offset: number, sortDirection: 'asc' | 'desc') {
  const { mapsRepo } = await getServerContext();
  return _unwrap(
    mapsRepo.searchMaps({ query: '', offset, limit: PAGE, sort: 'title', sortDirection })
  );
}

describe('maps repo pagination', () => {
  it('pages through all generated maps with no gaps or duplicates', async () => {
    // Start from a clean slate: drop the seed maps (see supabase/seed.sql) so the generated set is
    // the only public data and counts are exact.
    const { pool } = await getServerContext();
    await pool.query('TRUNCATE maps, difficulties, favorites CASCADE');

    const expectedTitles: string[] = [];
    for (let i = 0; i < TOTAL; i++) {
      await uploadGeneratedMap(i);
      expectedTitles.push(`Pagination Map ${String(i).padStart(3, '0')}`);
    }

    // Walk every page sorted by title ascending; titles are unique, so the order is deterministic.
    const collected: string[] = [];
    for (let offset = 0; offset < TOTAL; offset += PAGE) {
      const maps = await page(offset, 'asc');
      expect(maps).toHaveLength(PAGE);
      collected.push(...maps.map((m) => m.title));
    }
    // Exactly TOTAL maps, in order, with no duplicates or skipped rows.
    expect(collected).toEqual(expectedTitles);
    expect(new Set(collected).size).toBe(TOTAL);

    // The page past the end is empty.
    expect(await page(TOTAL, 'asc')).toHaveLength(0);

    // Descending pagination yields the reverse order.
    const descending: string[] = [];
    for (let offset = 0; offset < TOTAL; offset += PAGE) {
      const maps = await page(offset, 'desc');
      descending.push(...maps.map((m) => m.title));
    }
    expect(descending).toEqual([...expectedTitles].reverse());
  }, 120000);

  // RED: documents the known pagination bug from the search review. searchMaps' ORDER BY has no
  // unique tiebreaker, so rows with equal sort keys come back in an arbitrary (scan-dependent)
  // order. This test fails until searchMaps appends `id` to every ORDER BY (or moves to keyset
  // pagination). Uses direct inserts (mirroring maps_repo_filters.test.ts) to control the id and
  // submission_date exactly, which the upload flow can't (it generates ids and stamps now()).
  it('orders maps with tied sort keys deterministically by id', async () => {
    const { pool, mapsRepo } = await getServerContext();
    await pool.query('TRUNCATE maps, difficulties, favorites CASCADE');

    // Every map shares one submission_date, so the default `submission_date DESC` order cannot
    // distinguish them; only a tiebreaker can. Insert in a shuffled order so any stable total
    // order has to come from the tiebreaker, not from insertion/scan order.
    const TIED_DATE = '2022-01-01T00:00:00.000Z';
    const suffixes = ['07', '02', '09', '04', '00', '06', '01', '08', '03', '05'];
    for (const s of suffixes) {
      await pool.query(
        `INSERT INTO maps
           (id, visibility, validity, submission_date, title, artist, uploader, download_count, complexity)
         VALUES ($1, $2, 'valid', $3, $4, 'Artist', 'tester', 0, 1)`,
        [`m${s}`, MapVisibility.PUBLIC, TIED_DATE, `Title ${s}`]
      );
    }

    const paged: string[] = [];
    for (let offset = 0; offset < suffixes.length; offset += 4) {
      const maps = await _unwrap(mapsRepo.searchMaps({ query: '', offset, limit: 4 }));
      paged.push(...maps.map((m) => m.id));
    }

    const expected = suffixes.map((s) => `m${s}`).sort();
    // Static offset paging is self-consistent, so every id is still seen exactly once...
    expect(new Set(paged).size).toBe(suffixes.length);
    // ...but the order across tied rows must be the deterministic, id-ordered sequence a unique
    // tiebreaker produces. Currently it isn't, so this fails.
    expect(paged).toEqual(expected);
  });
});

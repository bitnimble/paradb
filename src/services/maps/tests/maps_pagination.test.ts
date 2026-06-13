import { completeMapUpload } from 'app/api/maps/submit/complete/complete_upload';
import { _unwrap } from 'base/result';
import { MapVisibility } from 'schema/maps';
import { IdDomain, generateId } from 'services/db/id_gen';
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
  const result = await completeMapUpload(id, false);
  if (!result.success) {
    throw new Error(`Failed to publish generated map ${n}: ${result.errorMessage}`);
  }
  return result.value.id;
}

async function page(offset: number, sortDirection: 'asc' | 'desc') {
  const { mapsRepo } = await getServerContext();
  const result = await _unwrap(
    mapsRepo.searchMaps({ query: '', offset, limit: PAGE, sort: 'title', sortDirection })
  );
  return result.maps;
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

  // Direct-inserts public maps with a shared submission_date (which the upload flow can't set),
  // using real generated ids.
  it('orders maps with tied sort keys deterministically by id', async () => {
    const { pool, mapsRepo } = await getServerContext();
    await pool.query('TRUNCATE maps, difficulties, favorites CASCADE');

    // Every map shares one submission_date, so the default `submission_date DESC` order can't
    // distinguish them; only a tiebreaker can. The ids are random, so insertion/scan order won't
    // accidentally match id order - a stable total order has to come from the tiebreaker.
    const TIED_DATE = '2022-01-01T00:00:00.000Z';
    const COUNT = 10;
    const ids: string[] = [];
    for (let i = 0; i < COUNT; i++) {
      const id = await generateId(
        IdDomain.MAPS,
        async (candidate) =>
          ((await pool.query('SELECT 1 FROM maps WHERE id = $1', [candidate])).rowCount ?? 0) > 0
      );
      if (id == null) {
        throw new Error('Could not generate a unique map id');
      }
      ids.push(id);
      await pool.query(
        `INSERT INTO maps
           (id, visibility, validity, submission_date, title, artist, uploader, download_count, complexity)
         VALUES ($1, $2, 'valid', $3, $4, 'Artist', 'tester', 0, 1)`,
        [id, MapVisibility.PUBLIC, TIED_DATE, `Title ${i}`]
      );
    }

    const paged: string[] = [];
    for (let offset = 0; offset < COUNT; offset += 4) {
      const { maps } = await _unwrap(mapsRepo.searchMaps({ query: '', offset, limit: 4 }));
      paged.push(...maps.map((m) => m.id));
    }

    // Every id is seen exactly once...
    expect(new Set(paged).size).toBe(COUNT);
    // ...and tied rows come back in the deterministic, id-ordered sequence the tiebreaker produces.
    expect(paged).toEqual([...ids].sort());
  });
});

import { Pool } from 'pg';

// Direct Postgres access to the running Supabase DB (connection comes from .env.e2e, layered in by
// tools/e2e.sh). Used to seed many maps quickly: uploading 20+ through the real submit flow would
// be far too slow just to populate a list for the pagination test.
let pool: Pool | undefined;
function getPool(): Pool {
  if (pool == null) {
    pool = new Pool({
      host: process.env.PGHOST,
      port: Number(process.env.PGPORT),
      user: process.env.PGUSER,
      database: process.env.PGDATABASE,
      password: process.env.PGPASSWORD,
    });
  }
  return pool;
}

export type SeededMap = { id: string; title: string };

/**
 * Inserts `count` public, valid maps that all share one (caller-supplied, run-unique) artist, so a
 * search for that artist isolates exactly this run's maps from anything else in the persisted DB.
 */
export async function seedPublicMaps(opts: {
  artist: string;
  count: number;
  idPrefix: string;
}): Promise<SeededMap[]> {
  const { artist, count, idPrefix } = opts;
  const maps: SeededMap[] = [];
  for (let i = 0; i < count; i++) {
    const n = String(i).padStart(3, '0');
    const id = `${idPrefix}${n}`;
    const title = `Infinite Scroll Map ${n}`;
    await getPool().query(
      `INSERT INTO maps
         (id, visibility, validity, submission_date, title, artist, uploader, download_count, complexity)
       VALUES ($1, 'public', 'valid', $2, $3, $4, 'e2e', 0, 1)`,
      [id, new Date(Date.now() + i * 1000).toISOString(), title, artist]
    );
    maps.push({ id, title });
  }
  return maps;
}

export async function deleteSeededMaps(artist: string): Promise<void> {
  await getPool().query('DELETE FROM maps WHERE artist = $1', [artist]);
}

export async function closeSeedPool(): Promise<void> {
  if (pool != null) {
    await pool.end();
    pool = undefined;
  }
}

import * as fs from 'fs/promises';
import * as path from 'path';
import pg from 'pg';
import { parse as parseToml } from 'smol-toml';

// Runs once before the integration suite. The PGlite server (started by tools/test.sh) boots
// an empty database, so we load the app schema here. Data is truncated/seeded per-test in
// jest_setup.ts.
const SUPABASE_DIR = path.resolve(process.cwd(), 'supabase');
// Supabase-coupled files PGlite can't load: functions.sql references the `auth` schema / `auth.uid()`
// / `crypt`, and misc.sql creates extensions (hypopg, index_advisor) that don't exist in PGlite. The
// fake Supabase client reimplements what the tests need, so these are intentionally skipped.
const SKIPPED_FILES = ['functions.sql', 'misc.sql'];

// Derives the ordered schema files from `[db.migrations] schema_paths` in supabase/config.toml: the
// same ordered list (explicit files plus a trailing `./schemas/*.sql` glob) that Supabase itself
// applies. This keeps the test load order in sync with the real database and picks up new files
// automatically; only the PGlite-incompatible files above are dropped.
async function resolveSchemaFiles(): Promise<string[]> {
  const config = parseToml(await fs.readFile(path.join(SUPABASE_DIR, 'config.toml'), 'utf8')) as {
    db?: { migrations?: { schema_paths?: string[] } };
  };
  const patterns = config.db?.migrations?.schema_paths;
  if (!patterns?.length) {
    throw new Error('No [db.migrations] schema_paths found in supabase/config.toml');
  }

  const ordered: string[] = [];
  const seen = new Set<string>();
  const add = (relPath: string) => {
    if (!seen.has(relPath)) {
      seen.add(relPath);
      ordered.push(relPath);
    }
  };
  for (const raw of patterns) {
    const pattern = raw.replace(/^\.\//, ''); // e.g. "./schemas/maps.sql" -> "schemas/maps.sql"
    if (!pattern.includes('*')) {
      add(pattern);
      continue;
    }
    // Expand a glob (e.g. "schemas/*.sql") to its sorted matches, matching Supabase's dedupe-by-
    // first-occurrence behaviour so already-listed files keep their explicit position.
    const dir = path.dirname(pattern);
    const matches = (await fs.readdir(path.join(SUPABASE_DIR, dir)))
      .filter((f) => f.endsWith('.sql'))
      .sort();
    for (const f of matches) add(path.join(dir, f));
  }
  return ordered.filter((f) => !SKIPPED_FILES.includes(path.basename(f)));
}

export default async function globalSetup() {
  const schemaFiles = await resolveSchemaFiles();

  const pool = new pg.Pool({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT),
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
  });
  try {
    // PGlite's TCP socket can be accepting connections before the Postgres protocol is fully
    // ready, so the first query needs retries; once we get a successful `select 1` the rest of
    // the schema load can run straight through.
    for (let attempt = 0; attempt < 30; attempt++) {
      try {
        await pool.query('select 1');
        break;
      } catch (err) {
        if (attempt === 29) throw err;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
    for (const file of schemaFiles) {
      const sql = await fs.readFile(path.join(SUPABASE_DIR, file), 'utf8');
      await pool.query(sql);
    }
  } finally {
    await pool.end();
  }
}

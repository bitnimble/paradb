import * as fs from 'fs/promises';
import * as path from 'path';
import pg from 'pg';
import { parse as parseToml } from 'smol-toml';

// Shared between the integration test global setup and the local dev bootstrap (tools/dev.sh):
// resolves the ordered schema files from `[db.migrations] schema_paths` in supabase/config.toml,
// the same list Supabase itself applies, then loads them into the target Postgres. PGlite can't
// run the auth-coupled / extension files Supabase real-deploys, so those are dropped.

const SUPABASE_DIR = path.resolve(process.cwd(), 'supabase');
// functions.sql references the `auth` schema / `auth.uid()` / `crypt`; misc.sql creates extensions
// (hypopg, index_advisor) PGlite doesn't ship. The fake Supabase client reimplements what we need.
const SKIPPED_FILES = ['functions.sql', 'misc.sql'];

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
    const pattern = raw.replace(/^\.\//, '');
    if (!pattern.includes('*')) {
      add(pattern);
      continue;
    }
    // Expand a glob (e.g. "schemas/*.sql") to its sorted matches, matching Supabase's
    // dedupe-by-first-occurrence behaviour so already-listed files keep their explicit position.
    const dir = path.dirname(pattern);
    const matches = (await fs.readdir(path.join(SUPABASE_DIR, dir)))
      .filter((f) => f.endsWith('.sql'))
      .sort();
    for (const f of matches) add(path.join(dir, f));
  }
  return ordered.filter((f) => !SKIPPED_FILES.includes(path.basename(f)));
}

// PGlite's TCP socket can be accepting connections before the Postgres protocol is fully ready,
// so the first query needs retries; once we get a successful `select 1` the rest can run straight.
async function waitForReady(pool: pg.Pool) {
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      await pool.query('select 1');
      return;
    } catch (err) {
      if (attempt === 29) throw err;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

async function isSchemaLoaded(pool: pg.Pool): Promise<boolean> {
  const result = await pool.query(
    "select 1 from information_schema.tables where table_schema = 'public' and table_name = 'maps' limit 1"
  );
  return result.rowCount != null && result.rowCount > 0;
}

export async function loadSchema(
  pool: pg.Pool,
  opts: { includeSeed?: boolean; skipIfLoaded?: boolean } = {}
): Promise<{ loaded: boolean }> {
  await waitForReady(pool);
  if (opts.skipIfLoaded && (await isSchemaLoaded(pool))) {
    return { loaded: false };
  }
  for (const file of await resolveSchemaFiles()) {
    const sql = await fs.readFile(path.join(SUPABASE_DIR, file), 'utf8');
    await pool.query(sql);
  }
  if (opts.includeSeed) {
    const seedSql = await fs.readFile(path.join(SUPABASE_DIR, 'seed.sql'), 'utf8');
    await pool.query(seedSql);
  }
  return { loaded: true };
}

// CLI entrypoint for tools/dev.sh: load schema + seed against the env-configured Postgres if not
// already loaded. Idempotent so repeated `bun dev` runs against the same PGlite directory are safe.
async function main() {
  const pool = new pg.Pool({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT),
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
  });
  try {
    const { loaded } = await loadSchema(pool, { includeSeed: true, skipIfLoaded: true });
    console.log(loaded ? 'Schema loaded.' : 'Schema already loaded, skipping.');
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

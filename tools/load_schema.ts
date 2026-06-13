import * as fs from 'fs/promises';
import * as path from 'path';
import pg from 'pg';

// Shared between the integration test global setup and the local dev bootstrap (tools/dev.sh):
// applies the real `supabase/migrations` in order to the target Postgres, so the test/dev DB matches
// exactly what Supabase deploys to production (rather than a hand-maintained declarative copy that
// can drift).
//
// PGlite isn't Supabase, so two migration concerns are handled here: the GRANTs target Supabase
// roles that don't exist (created in the prelude), and a couple of `create extension` statements
// reference extensions PGlite doesn't ship (stripped). The auth-coupled functions still load because
// the migration sets `check_function_bodies = off`, and RLS is a no-op under PGlite's superuser
// connection.

const SUPABASE_DIR = path.resolve(process.cwd(), 'supabase');
const MIGRATIONS_DIR = path.join(SUPABASE_DIR, 'migrations');

// Create the roles the migration GRANTs target. Idempotent so a `skipIfLoaded` re-run (dev) against
// an already-bootstrapped DB doesn't error on existing roles.
const MIGRATION_PRELUDE = `
DO $$ BEGIN CREATE ROLE anon; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE authenticated; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE service_role; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
`;

// PGlite doesn't ship hypopg / index_advisor (advisory-only, unused at runtime), and `create
// extension` would error, so drop those statements.
function stripUnsupportedStatements(sql: string): string {
  return sql.replace(/create extension[^;]*;/gi, '');
}

async function resolveMigrationFiles(): Promise<string[]> {
  // Supabase applies migrations in lexicographic (timestamp-prefixed) filename order.
  return (await fs.readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort();
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
  await pool.query(MIGRATION_PRELUDE);
  for (const file of await resolveMigrationFiles()) {
    const sql = stripUnsupportedStatements(
      await fs.readFile(path.join(MIGRATIONS_DIR, file), 'utf8')
    );
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

if ((import.meta as { main?: boolean }).main) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

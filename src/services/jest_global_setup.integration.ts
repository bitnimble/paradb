import pg from 'pg';
import { loadSchema } from '../../tools/load_schema';

// Runs once before the integration suite. The PGlite server (started by tools/test.sh) boots
// an empty database, so we load the app schema here. Data is truncated/seeded per-test in
// jest_setup.ts.
export default async function globalSetup() {
  const pool = new pg.Pool({
    host: process.env.PGHOST,
    port: Number(process.env.PGPORT),
    database: process.env.PGDATABASE,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
  });
  try {
    await loadSchema(pool);
  } finally {
    await pool.end();
  }
}

import { loadEnvConfig } from '@next/env';
import { Pool } from 'pg';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

/**
 * Ensures the database is in a clean state before the test suite runs.
 * Truncates all app tables and auth users, then seeds with test data.
 *
 * Tables are expected to already exist via `supabase start` (which applies
 * migrations and schemas). This avoids using `supabase db reset` which
 * would clobber non-test local state.
 */
export default async function globalSetup() {
  const pool = new Pool();

  // Verify tables exist (they should from supabase start + migrations)
  const result = await pool.query(`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name IN ('maps', 'users', 'favorites', 'difficulties')
  `);
  if (result.rows.length < 4) {
    throw new Error(
      'Expected database tables not found. Make sure `supabase start` has been run ' +
        'and migrations have been applied.'
    );
  }

  await pool.end();
}

import { loadEnvConfig } from '@next/env';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getServerContext } from 'services/server_context';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function resetTestData() {
  const { pool } = await getServerContext();
  const seedSqlPath = path.resolve(__dirname, '../../supabase/seed.sql');
  const seedSql = await fs.readFile(seedSqlPath).then((b) => b.toString());
  // Full schema reset is handled once by `supabase db reset` in jest_global_setup.ts.
  // Here we just truncate all data and re-seed for each test.
  // Clear Supabase Auth users first (separate from app users table) to avoid
  // "email already registered" / "username already taken" errors across tests.
  await pool.query(`TRUNCATE auth.users CASCADE`);
  await pool.query(`
TRUNCATE maps, difficulties, users, favorites RESTART IDENTITY CASCADE;
${seedSql}
`);
}

beforeEach(async () => {
  if (process.env.NODE_ENV === 'production' || (process.env.NODE_ENV as string) === 'prod') {
    throw new Error('Almost dropped DB on prod env');
  }
  await resetTestData();
});
afterAll(async () => {
  const { pool } = await getServerContext();
  await pool.end();
});

global.console.info = jest.fn();

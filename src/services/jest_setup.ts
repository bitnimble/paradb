import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getServerContext } from 'services/server_context';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function deleteAllAuthUsers() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SECRET_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) {
    throw new Error(`Failed to list auth users: ${error.message}`);
  }
  for (const user of data.users) {
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
    if (deleteError) {
      throw new Error(`Failed to delete auth user ${user.id}: ${deleteError.message}`);
    }
  }
}

async function resetTestData() {
  const { pool } = await getServerContext();
  const seedSqlPath = path.resolve(__dirname, '../../supabase/seed.sql');
  const seedSql = await fs.readFile(seedSqlPath).then((b) => b.toString());
  // Full schema setup is handled by `supabase start` (migrations + schemas).
  // Here we just truncate all data and re-seed for each test.
  // Clear Supabase Auth users via the admin SDK to avoid
  // "email already registered" / "username already taken" errors across tests.
  await deleteAllAuthUsers();
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

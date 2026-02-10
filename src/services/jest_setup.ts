import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getServerContext } from 'services/server_context';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
);

async function deleteAllAuthUsers() {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) {
    throw new Error(`Failed to list auth users: ${error.message}`);
  }
  await Promise.all(
    data.users.map(async (user) => {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
      if (deleteError) {
        throw new Error(`Failed to delete auth user ${user.id}: ${deleteError.message}`);
      }
    })
  );
}

async function resetTestData() {
  const { pool } = await getServerContext();
  const seedSqlPath = path.resolve(__dirname, '../../supabase/seed.sql');
  const seedSql = await fs.readFile(seedSqlPath).then((b) => b.toString());
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

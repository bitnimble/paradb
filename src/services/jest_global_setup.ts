import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

/**
 * Ensures the database is in a clean state before the test suite runs.
 *
 * Tests run against a dedicated Supabase instance (started via
 * `supabase start --workdir supabase-test`) with its own Postgres, Auth,
 * and Storage, fully isolated from the local dev instance.
 *
 * Schema DDL and seed data are applied automatically by `supabase start`
 * via the declarative schema config. This function just cleans up any
 * leftover Supabase Auth users from previous test runs.
 */
export default async function globalSetup() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error(
      'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY must be set in .env.test. ' +
        'Run `supabase status --workdir supabase-test` and copy the anon key and service_role key.'
    );
  }

  // Delete any leftover Supabase Auth users from previous test runs
  const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey);
  const { data } = await supabaseAdmin.auth.admin.listUsers();
  if (data?.users) {
    await Promise.all(data.users.map((user) => supabaseAdmin.auth.admin.deleteUser(user.id)));
  }
}

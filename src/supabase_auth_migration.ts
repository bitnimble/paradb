import { loadEnvConfig } from '@next/env';
import { getDbPool } from 'services/db/pool';
import { _unsafeCreateAdminSupabaseServerClient } from 'services/session/supabase_server';
import * as db from 'zapatos/db';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

function hex2ascii(hex: `\\x${string}`): string {
  return Buffer.from(hex.slice(2), 'hex').toString();
}

(async () => {
  const pool = await getDbPool();
  const supabaseAdmin = await _unsafeCreateAdminSupabaseServerClient();

  const users = await db.select('users', {}).run(pool);
  console.log(`Retrieved ${users.length} user records from users table`);

  for (const user of users) {
    if (user.supabase_id != null) {
      console.log(`Already processed ${user.id} / ${user.email}, skipping`);
      continue;
    }
    // Change $2b to $2a in the bcrypt hash because Supabase expects $2a, and will successfully
    // allow a login attempt but invisible fail random DB crypto calls
    let hash = hex2ascii(user.password);
    if (hash.startsWith('$2b')) {
      hash = '$2a' + hash.slice(3);
    }

    // Create the user in Supabase auth
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: user.email.trim(),
      password_hash: hash,
      user_metadata: {
        id: user.id,
        username: user.username.trim(),
      },
      // No users are currently email confirmed, but Supabase requires confirmed emails for login,
      // even with the setting disabled. Insert them as confirmed and deal with confirmation later
      // for these users (they will have 'U' in the public.users.email_status column).
      email_confirm: true,
    });
    if (error) {
      if (error.code === 'email_exists') {
        // Duplicate user, probably due to case-insensitivity bugs. Just skip
        console.log(`Encountered duplicate email: ${user.email}`);
        continue;
      } else if (error.code === 'validation_failed') {
        console.log(`Validation failed for ${user.id}; "${user.email}"; "${user.username}"`);
        continue;
      } else {
        console.log('--------------- FAILURE ---------------');
        console.log(
          `Error when processing user: ${user.id}; ${user.username}; ${user.email}; ${hash}`
        );
        console.log(error);
        return;
      }
    }
    console.log(`Processed ${user.id}; ${user.email}; ${data.user.id}`);

    // Write supabase user ID back to public.users table
    try {
      await db.update('users', { supabase_id: data.user.id }, { id: user.id }).run(pool);
    } catch (e) {
      console.log('--------------- FAILURE ---------------');
      console.log(
        `Error when updating supabase_id for user: ${user.id}; ${user.username}; ${user.email}; ${data.user.id}`
      );
      console.log(e);
      return;
    }

    // Migrate other user attributes manually in SQL afterwards
    // creation_date, password_updated
    // goes to created_at, updated_at
    // timestamp and timestamptz are both stored the same on-disk, so no conversion is necessary
  }
  console.log(`\nSuccessfully migrated ${users.length} users.`);
  await pool.end();
})();

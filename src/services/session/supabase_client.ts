import { createBrowserClient } from '@supabase/ssr';
import { Database } from 'services/db/db.types';

export function createClient() {
  // IMPORTANT! Do not reference getEnvVars() here to pull the Supabase environment variables,
  // which may leak private keys.
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}

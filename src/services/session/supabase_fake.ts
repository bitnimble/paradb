import type { SupabaseClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { cookies } from 'next/headers';
import { Database } from 'services/db/db.types';
import { getDbPool } from 'services/db/pool';
import * as db from 'zapatos/db';

// Fake Supabase client used by the integration tests (gated by SUPABASE_IMPLEMENTATION=fake), so the
// suite can run without a live Supabase instance. Sessions are carried in a self-contained cookie
// token rather than a real JWT, and email existence is derived from the local `users` table (which
// the test harness truncates/seeds). The only in-memory state is `testUserOverride`, which is
// reset per-test in jest_setup.ts.

const FAKE_SESSION_COOKIE = 'fake-supabase-session';

type FakeSession = { id: string; username: string; email: string; supabaseId: string };

// In-process tests (no HTTP cookie scope) opt into an authenticated session by calling
// `_setCurrentUserForTesting`. Without it, `getUser()` returns no-user so missing auth surfaces
// as a test failure instead of silently authenticating as a synthetic user.
type TestUserOverride = { id?: string; email: string; username?: string };
let testUserOverride: TestUserOverride | null = null;
export function _setCurrentUserForTesting(override: TestUserOverride | null) {
  testUserOverride = override;
}

// Deterministically map an email to a stable UUID. `users.supabase_id` is a uuid column, and
// `check_email_exists` finds a previously-signed-up email by recomputing this id and querying it.
function emailToSupabaseId(email: string): string {
  const h = createHash('md5').update(email.toLowerCase()).digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

function encode(session: FakeSession): string {
  return Buffer.from(JSON.stringify(session)).toString('base64url');
}
function decode(value: string): FakeSession {
  return JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));
}

async function setSessionCookie(session: FakeSession) {
  // In a route handler this attaches a Set-Cookie header. Outside a request scope (in-process tests)
  // cookies() throws, which we ignore since those tests don't read the session back via a cookie.
  try {
    (await cookies()).set(FAKE_SESSION_COOKIE, encode(session), { path: '/' });
  } catch {
    /* no request scope */
  }
}

function authError(message: string) {
  return { name: 'AuthError', status: 501, message };
}

export function fakeSupabaseClient(): SupabaseClient<Database> {
  const client = {
    auth: {
      async signUp(credentials: {
        email: string;
        password: string;
        options?: { data?: { id?: string; username?: string } };
      }) {
        const supabaseId = emailToSupabaseId(credentials.email);
        // Mirror real Supabase: reject signups that re-use an existing email. The app's `users`
        // table is the source of truth since the fake has no separate auth-users store.
        const existing = await db.count('users', { supabase_id: supabaseId }).run(getDbPool());
        if (existing > 0) {
          return {
            data: { user: null, session: null },
            error: authError('User already registered'),
          };
        }
        const session: FakeSession = {
          id: credentials.options?.data?.id ?? '',
          username: credentials.options?.data?.username ?? '',
          email: credentials.email,
          supabaseId,
        };
        await setSessionCookie(session);
        // Mirror real Supabase signup (no session until email confirmation) and, more importantly,
        // keep the signup response body as just `{ success: true }`. Auth for subsequent requests
        // rides on the Set-Cookie written above, not on a returned session.
        return {
          data: {
            user: {
              id: supabaseId,
              email: session.email,
              user_metadata: { id: session.id, username: session.username },
            },
            session: null,
          },
          error: null,
        };
      },

      async getUser() {
        let cookie;
        try {
          cookie = (await cookies()).get(FAKE_SESSION_COOKIE);
        } catch {
          // No request scope (in-process repo test). Use the explicit override if a test set one;
          // otherwise behave as unauthenticated so missing auth doesn't silently pass.
          if (testUserOverride == null) {
            return { data: { user: null }, error: authError('No fake session') };
          }
          return {
            data: {
              user: {
                id: emailToSupabaseId(testUserOverride.email),
                email: testUserOverride.email,
                user_metadata: {
                  id: testUserOverride.id ?? 'TEST',
                  username: testUserOverride.username ?? 'test',
                },
              },
            },
            error: null,
          };
        }
        if (!cookie) {
          return { data: { user: null }, error: authError('No fake session') };
        }
        const session = decode(cookie.value);
        return {
          data: {
            user: {
              id: session.supabaseId,
              email: session.email,
              user_metadata: { id: session.id, username: session.username },
            },
          },
          error: null,
        };
      },

      async updateUser() {
        return { data: { user: null }, error: null };
      },

      async signOut() {
        try {
          (await cookies()).delete(FAKE_SESSION_COOKIE);
        } catch {
          /* no request scope */
        }
        return { error: null };
      },

      // Login flows aren't exercised by the integration suite; these keep the surface from crashing
      // if reached.
      async signInWithPassword() {
        return {
          data: { session: null, user: null },
          error: authError('signInWithPassword not implemented in fake'),
        };
      },
      admin: {
        async getUserById() {
          return {
            data: { user: null },
            error: authError('admin.getUserById not implemented in fake'),
          };
        },
      },
    },

    async rpc(fn: string, args: Record<string, unknown>) {
      if (fn === 'check_email_exists') {
        const exists =
          (await db
            .count('users', { supabase_id: emailToSupabaseId(String(args.input_email)) })
            .run(getDbPool())) > 0;
        return { data: exists, error: null };
      }
      // Surface loudly so a newly-added rpc call doesn't silently succeed against the fake with a
      // null data value. Add the handler above when a new rpc is wired through.
      return {
        data: null,
        error: {
          name: 'PostgrestError',
          code: 'PGRST101',
          message: `rpc "${fn}" is not implemented in fakeSupabaseClient`,
          details: '',
          hint: 'Add a handler in src/services/session/supabase_fake.ts',
        },
      };
    },
  };

  return client as unknown as SupabaseClient<Database>;
}

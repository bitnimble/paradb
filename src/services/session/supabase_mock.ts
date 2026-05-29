// Minimal fake Supabase client for tests that only transitively depend on Supabase auth (e.g.
// creating a user as test setup). It returns successful, hardcoded responses for the auth methods
// that `createUser` exercises. Tests that actually verify auth/signup/login flows should run
// against a real local Supabase instead.

let fakeSupabaseUserCounter = 0;

export function fakeSupabaseClient() {
  return {
    auth: {
      signUp: async () => ({
        data: { user: { id: `fake-supabase-${++fakeSupabaseUserCounter}` }, session: null },
        error: null,
      }),
    },
    // `check_email_exists` returns false (email not taken) for any input.
    rpc: async () => ({ data: false, error: null }),
  };
}

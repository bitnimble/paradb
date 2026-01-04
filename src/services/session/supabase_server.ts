// import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';
import { getEnvVars } from 'services/env';
import { Database } from 'services/db/db.types';

export async function createSupabaseServerClient(skipCookies?: true) {
  const envVars = getEnvVars();
  if (skipCookies) {
    return createServerClient<Database>(envVars.supabaseUrl, envVars.supabasePublishableKey, {
      cookies: {
        getAll() {
          return [];
        },
      },
    });
  }
  const cookieStore = await cookies();
  return createServerClient<Database>(envVars.supabaseUrl, envVars.supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}

export async function _unsafeCreateAdminSupabaseServerClient() {
  const envVars = getEnvVars();
  return createServerClient<Database>(envVars.supabaseUrl, envVars.supabaseSecretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    cookies: {
      getAll() {
        return [];
      },
    },
  });
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });
  const envVars = getEnvVars();

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.

  createServerClient<Database>(envVars.supabaseUrl, envVars.supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.
  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse;
}

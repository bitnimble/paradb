import 'server-only';

import { redirect } from 'next/navigation';
import { cache } from 'react';
import { UserSession } from 'schema/users';
import { getServerContext } from 'services/server_context';
import { UserRole, getUser } from 'services/users/users_repo';
import { RoutePath, routeFor } from 'utils/routes';

export const getUserSession = cache(async (): Promise<UserSession | undefined> => {
  const { supabase } = await getServerContext();
  const user = await supabase.auth.getUser();
  if (user.error || !user.data.user.email) {
    return undefined;
  }
  const metadata = user.data.user.user_metadata;
  return {
    id: metadata.id,
    email: user.data.user.email,
    username: metadata.username,
  };
});

export const verifyHasSession = cache(async () => {
  const session = await getUserSession();
  if (!session) {
    redirect(routeFor([RoutePath.LOGIN]));
  }
  return session;
});

// Looks up the current user's site-level role. Returns undefined if logged out or the user
// record can't be found. Kept off the getUserSession hot path - only call when a role check
// is actually needed (e.g. owner-gated admin routes).
export const getUserRole = cache(async (): Promise<UserRole | undefined> => {
  const session = await getUserSession();
  if (!session) {
    return undefined;
  }
  const result = await getUser({ by: 'id', id: session.id });
  if (!result.success) {
    return undefined;
  }
  return result.value.role as UserRole;
});

export const verifyOwner = cache(async () => {
  const session = await verifyHasSession();
  const role = await getUserRole();
  // The session is already confirmed, so a missing role means the lookup failed - fail loudly
  // rather than silently denying access to a legitimate owner.
  if (role == null) {
    throw new Error('Failed to load user role');
  }
  if (role !== UserRole.OWNER) {
    redirect(routeFor([RoutePath.MAP_LIST]));
  }
  return session;
});

export async function clearUserSession() {
  const { supabase } = await getServerContext();
  await supabase.auth.signOut({ scope: 'local' });
}

import 'server-only';

import { redirect } from 'next/navigation';
import { cache } from 'react';
import { UserSession } from 'schema/users';
import { getServerContext } from 'services/server_context';
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

export async function clearUserSession() {
  const { supabase } = await getServerContext();
  await supabase.auth.signOut({ scope: 'local' });
}

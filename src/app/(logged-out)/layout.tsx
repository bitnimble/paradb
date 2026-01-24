'use client';

import { redirect } from 'next/navigation';
import React from 'react';
import { useSession } from 'ui/session/session_provider';
import { routeFor, RoutePath } from 'utils/routes';

export default function LoggedOutLayout({ children }: React.PropsWithChildren) {
  const session = useSession();
  if (session) {
    redirect(routeFor([RoutePath.MAP_LIST]));
  }
  return children;
}

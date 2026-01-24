'use client';

import React, { createContext, use } from 'react';
import { UserSession } from 'schema/users';

const SessionContext = createContext<UserSession | undefined>(undefined);
export const SessionProvider = ({
  children,
  session,
}: React.PropsWithChildren<{ session: UserSession | undefined }>) => {
  return <SessionContext.Provider value={session}>{children}</SessionContext.Provider>;
};

/**
 * Returns a Suspense-enabled session context for the current user (or null if logged out)
 */
export const useSession = () => {
  return use(SessionContext);
};

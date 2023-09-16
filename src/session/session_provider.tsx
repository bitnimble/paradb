'use client';

import { useApi } from 'api/api_provider';
import React, { createContext, useContext } from 'react';
import { SessionPresenter, SessionStore } from 'session/session_presenter';

const store = new SessionStore();
const SessionContext = createContext(store);

export const SessionProvider = ({ children }: React.PropsWithChildren) => {
  const api = useApi();
  React.useEffect(() => {
    const presenter = new SessionPresenter(api, store);
    presenter.maybeLoadSession();
  }, []);

  return <SessionContext.Provider value={store}>{children}</SessionContext.Provider>;
};

export const useSession = () => {
  return useContext(SessionContext);
};

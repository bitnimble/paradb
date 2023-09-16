'use client';

import { FakeApi } from 'api/fake_api';
import React, { createContext, useContext } from 'react';

// TODO: use real api based on server props / bootstrap / env args
const api = new FakeApi();
const ApiContext = createContext(api);

export const ApiProvider = ({ children }: React.PropsWithChildren) => {
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
};

export const useApi = () => {
  return useContext(ApiContext);
};

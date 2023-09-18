'use client';

import { HttpApi } from 'app/api/api';
import React from 'react';

const api = new HttpApi();
const ApiContext = React.createContext(api);

export const ApiProvider = ({ children }: React.PropsWithChildren) => {
  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
};

export const useApi = () => {
  return React.useContext(ApiContext);
};

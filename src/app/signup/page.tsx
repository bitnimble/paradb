'use client';

import { createLoginSignupPage } from 'app/_auth/create';
import { useApi } from 'app/api/api_provider';
import React from 'react';

export default () => {
  const api = useApi();
  // TODO: convert to canonical next/react hooks
  const [LoginSignupPage] = React.useState(() => createLoginSignupPage(api));
  return <LoginSignupPage mode="signup" />;
};

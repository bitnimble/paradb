'use client';

import { useApi } from 'api/api_provider';
import { useState } from 'react';
import { createSubmitMapPage } from '../_components/create';

export default () => {
  const api = useApi();
  // TODO: convert to canonical next/react hooks
  const [SubmitMapPage] = useState(() => createSubmitMapPage(api));

  return <SubmitMapPage />;
};

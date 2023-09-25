'use client';

import { useApi } from 'app/api/api_provider';
import { useState } from 'react';
import { createSubmitMapPage } from '../_components/create';
import { observer } from 'mobx-react';

export default observer(() => {
  const api = useApi();
  // TODO: convert to canonical next/react hooks
  const [SubmitMapPage] = useState(() => createSubmitMapPage(api));

  return <SubmitMapPage />;
});

'use client';

import { useApi } from 'app/api/api_provider';
import { useState } from 'react';
import { createSubmitMapPage } from '../_components/create';
import { observer } from 'mobx-react';
import { useRouter } from 'next/navigation';

export default observer(() => {
  const api = useApi();
  const router = useRouter();
  // TODO: convert to canonical next/react hooks
  const [SubmitMapPage] = useState(() => createSubmitMapPage(api, router));

  return <SubmitMapPage />;
});

'use client';

import { useApi } from 'app/api/api_provider';
import { observer } from 'mobx-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createSubmitMapPage } from '../_components/create';

export default observer(() => {
  const api = useApi();
  const router = useRouter();
  // TODO: convert to canonical next/react hooks
  const [SubmitMapPage] = useState(() => createSubmitMapPage(api, router));

  return <SubmitMapPage />;
});

'use client';

import { useApi } from 'app/api/api_provider';
import { useState } from 'react';
import { useSession } from 'session/session_provider';
import { createMapPage } from '../_components/create';

export default ({ params }: { params: { id: string } }) => {
  const api = useApi();
  const session = useSession();
  // TODO: convert to canonical next/react hooks
  const [MapPage] = useState(() => createMapPage(api, session));

  return <MapPage id={params.id} map={undefined} />;
};

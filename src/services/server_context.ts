import 'server-only';

import { initPool } from 'services/db/pool';
import { getEnvVars } from 'services/env';
import { MapsRepo, MeilisearchMap } from 'services/maps/maps_repo';
import { FavoritesRepo } from 'services/users/favorites_repo';
import MeiliSearch from 'meilisearch';

async function createServerContext() {
  const envVars = getEnvVars();

  const pool = await initPool();

  const meilisearch = new MeiliSearch({
    host: envVars.meilisearchHost,
    apiKey: envVars.meilisearchKey,
  });

  const mapsIndex = await meilisearch.getIndex<MeilisearchMap>('maps');
  const mapsRepo = new MapsRepo(mapsIndex);
  const favoritesRepo = new FavoritesRepo(mapsRepo, mapsIndex);

  return {
    pool,
    mapsRepo,
    favoritesRepo,
  };
}
const serverContext = createServerContext();
export const getServerContext = () => serverContext;

import { MeiliSearch } from 'meilisearch';
import { initPool } from 'services/db/pool';
import { getEnvVars } from 'services/env';
import { Flags } from 'services/flags';
import { MapsRepo, MeilisearchMap } from 'services/maps/maps_repo';
import { FavoritesRepo } from 'services/users/favorites_repo';

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
    flags,
    mapsRepo,
    favoritesRepo,
  };
}

let serverContext: ReturnType<typeof createServerContext> | undefined;
export const getServerContext = () => {
  if (!serverContext) {
    serverContext = createServerContext();
  }
  return serverContext;
};
let flags: Flags | undefined;
export const getFlags = () => {
  if (!flags) {
    flags = new Flags();
  }
  return flags;
};

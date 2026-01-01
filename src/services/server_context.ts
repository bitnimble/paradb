import { MeiliSearch } from 'meilisearch';
import { Pool } from 'pg';
import { getDbPool } from 'services/db/pool';
import { getEnvVars } from 'services/env';
import { Flags } from 'services/flags';
import { MapsRepo, MeilisearchMap } from 'services/maps/maps_repo';
import { FavoritesRepo } from 'services/users/favorites_repo';
import { createSupabaseServerClient } from './session/supabase_server';
import { rebuildMeilisearchIndex } from 'app/api/maps/search/rebuild/route';

type ServerContext = {
  pool: Pool;
  flags: Flags;
  mapsRepo: MapsRepo;
  favoritesRepo: FavoritesRepo;
};

async function createServerContext() {
  console.log('Creating server context');
  const envVars = getEnvVars();

  const pool = await getDbPool();

  const meilisearch = new MeiliSearch({
    host: envVars.meilisearchHost,
    apiKey: envVars.meilisearchKey,
  });

  if ((await meilisearch.getIndexes()).results.find((i) => i.uid === 'maps') == null) {
    await rebuildMeilisearchIndex();
  }
  const mapsIndex = await meilisearch.getIndex<MeilisearchMap>('maps');
  const mapsRepo = new MapsRepo(mapsIndex);
  const favoritesRepo = new FavoritesRepo(mapsRepo, mapsIndex);
  const flags = getFlags();

  return {
    pool,
    flags,
    mapsRepo,
    favoritesRepo,
  };
}

let _serverContext: Promise<ServerContext> | undefined;
export const getServerContext = async () => {
  if (!_serverContext) {
    // Assigning to _serverContext should be synchronous, so that another request doesn't attempt
    // to recreate the server context at the same time during the await.
    _serverContext = createServerContext();
  }
  // Supabase client must be re-created on each incoming request as it's dependent on cookies/JWT
  return { supabase: await createSupabaseServerClient(), ...(await _serverContext) };
};
let _flags: Flags | undefined;
export const getFlags = () => {
  if (!_flags) {
    _flags = new Flags();
  }
  return _flags;
};

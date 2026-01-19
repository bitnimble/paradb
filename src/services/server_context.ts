import { rebuildMeilisearchIndex } from 'app/api/maps/search/rebuild/route';
import { Pool } from 'pg';
import { getDbPool } from 'services/db/pool';
import { getEnvVars } from 'services/env';
import { Flags } from 'services/flags';
import { MapsRepo } from 'services/maps/maps_repo';
import { createMeilisearchIndex, meilisearchIndexExists } from 'services/search/meilisearch';
import { getSingleton } from 'services/singleton';
import { FavoritesRepo } from 'services/users/favorites_repo';
import { createSupabaseServerClient } from './session/supabase_server';

type ServerContext = {
  pool: Pool;
  flags: Flags;
  mapsRepo: MapsRepo;
  favoritesRepo: FavoritesRepo;
};

async function createServerContext(): Promise<ServerContext> {
  console.log('Creating server context');
  const envVars = getEnvVars();

  const pool = await getDbPool();

  const meilisearchConfig = {
    host: envVars.meilisearchHost,
    apiKey: envVars.meilisearchKey,
  };

  if (!(await meilisearchIndexExists(meilisearchConfig, 'maps'))) {
    await rebuildMeilisearchIndex();
  }
  const searchIndex = await createMeilisearchIndex(meilisearchConfig, 'maps');
  const mapsRepo = new MapsRepo(searchIndex);
  const favoritesRepo = new FavoritesRepo(mapsRepo, searchIndex);
  const flags = getFlags();

  return {
    pool,
    flags,
    mapsRepo,
    favoritesRepo,
  };
}

export const getServerContext = async () => {
  const serverContext = await getSingleton('_serverContext', createServerContext);
  // Supabase client must be re-created on each incoming request as it's dependent on cookies/JWT
  return {
    supabase: await createSupabaseServerClient(),
    ...serverContext,
  };
};
export const getFlags = () => {
  return getSingleton('_flags', () => new Flags());
};

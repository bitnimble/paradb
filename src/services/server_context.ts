import { rebuildMeilisearchIndex } from 'app/api/maps/search/rebuild/route';
import { Pool } from 'pg';
import { getDbPool } from 'services/db/pool';
import { getEnvVars } from 'services/env';
import { MapsRepo } from 'services/maps/maps_repo';
import { createMeilisearchIndex, meilisearchIndexExists } from 'services/search/meilisearch';
import { getSingleton } from 'services/singleton';
import { FavoritesRepo } from 'services/users/favorites_repo';
import { getLog } from './logging/server_logger';
import { PostgresIndex } from './search/postgres';
import { SearchIndex } from './search/types';
import { createSupabaseServerClient } from './session/supabase_server';

type ServerContext = {
  pool: Pool;
  mapsRepo: MapsRepo;
  favoritesRepo: FavoritesRepo;
};

async function createServerContext(): Promise<ServerContext> {
  const log = getLog(['server_context']);
  log.info('Creating server context');
  const envVars = getEnvVars();

  const pool = await getDbPool();

  let searchIndex: SearchIndex;
  if (envVars.searchImplementation === 'postgres') {
    searchIndex = new PostgresIndex();
  } else {
    const meilisearchConfig = {
      host: envVars.meilisearchHost,
      apiKey: envVars.meilisearchKey,
    };

    if (!(await meilisearchIndexExists(meilisearchConfig, 'maps'))) {
      await rebuildMeilisearchIndex();
    }
    searchIndex = await createMeilisearchIndex(meilisearchConfig, 'maps');
  }
  log.info(`Using ${envVars.searchImplementation} search index`);
  const mapsRepo = new MapsRepo(searchIndex);
  const favoritesRepo = new FavoritesRepo(mapsRepo, searchIndex);

  return {
    pool,
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

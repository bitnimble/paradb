import { Pool } from 'pg';
import { getDbPool } from 'services/db/pool';
import { MapsRepo } from 'services/maps/maps_repo';
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

  const pool = await getDbPool();

  const searchIndex: SearchIndex = new PostgresIndex();
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

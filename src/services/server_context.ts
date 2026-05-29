import { Pool } from 'pg';
import { getDbPool } from 'services/db/pool';
import { getEnvVars } from 'services/env';
import { MapsRepo } from 'services/maps/maps_repo';
import { RealS3Handler } from 'services/maps/s3_handler';
import { FakeS3Handler } from 'services/maps/s3_handler_fake';
import { S3Handler } from 'services/maps/s3_handler_types';
import { getSingleton } from 'services/singleton';
import { FavoritesRepo } from 'services/users/favorites_repo';
import { PostgresIndex } from './search/postgres';
import { SearchIndex } from './search/types';
import { createSupabaseServerClient } from './session/supabase_server';

// The repos and the S3 handler are cheap, stateless, and shared across requests, so they live on
// the singleton core. Postgres and Supabase are exposed as lazy getters on `getServerContext`.
type ServerContextCore = {
  s3Handler: S3Handler;
  mapsRepo: MapsRepo;
  favoritesRepo: FavoritesRepo;
};

function createServerContextCore(): ServerContextCore {
  const s3Handler: S3Handler =
    getEnvVars().s3Implementation === 'fake' ? new FakeS3Handler() : new RealS3Handler();
  const searchIndex: SearchIndex = new PostgresIndex();
  const mapsRepo = new MapsRepo(searchIndex, s3Handler);
  const favoritesRepo = new FavoritesRepo(mapsRepo, searchIndex);
  return { s3Handler, mapsRepo, favoritesRepo };
}

export function getServerContext() {
  const core = getSingleton('_serverContext', createServerContextCore);
  // Postgres and Supabase are instantiated lazily on first access, so callers (and tests) that
  // don't use them — or that mock them out — never trigger a real DB connection or cookie read.
  return {
    get pool(): Pool {
      return getDbPool();
    },
    // Supabase must be re-created per request as it depends on cookies/JWT.
    get supabase() {
      return createSupabaseServerClient();
    },
    s3Handler: core.s3Handler,
    mapsRepo: core.mapsRepo,
    favoritesRepo: core.favoritesRepo,
  };
}

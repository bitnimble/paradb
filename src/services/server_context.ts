import { Pool } from 'pg';
import { getDbPool } from 'services/db/pool';
import { getEnvVars } from 'services/env';
import { MapsRepo } from 'services/maps/maps_repo';
import { createS3Bucket } from 'services/s3/create_s3_bucket';
import { MapsS3Handler, S3Handler } from 'services/s3/maps_s3_handler';
import { S3Bucket } from 'services/s3/s3_bucket';
import { getSingleton } from 'services/singleton';
import { FavoritesRepo } from 'services/users/favorites_repo';
import { PostgresIndex } from './search/postgres';
import { SearchIndex } from './search/types';
import { createSupabaseServerClient } from './session/supabase_server';

// The repos, S3 handler, and assets bucket are cheap, stateless, and shared across requests, so they
// live on the singleton core. Postgres and Supabase are exposed as lazy getters on
// `getServerContext`.
type ServerContextCore = {
  s3Handler: S3Handler;
  assetsBucket: S3Bucket;
  mapsRepo: MapsRepo;
  favoritesRepo: FavoritesRepo;
};

function createServerContextCore(): ServerContextCore {
  const env = getEnvVars();
  const s3Handler: S3Handler = new MapsS3Handler(
    createS3Bucket(env.s3MapsBucket, env.publicS3BaseUrl)
  );
  const assetsBucket: S3Bucket = createS3Bucket(env.s3AssetsBucket, env.publicAssetsBaseUrl);
  const searchIndex: SearchIndex = new PostgresIndex();
  const mapsRepo = new MapsRepo(searchIndex, s3Handler);
  const favoritesRepo = new FavoritesRepo(mapsRepo, searchIndex);
  return { s3Handler, assetsBucket, mapsRepo, favoritesRepo };
}

export function getServerContext() {
  const core = getSingleton('_serverContext', createServerContextCore);
  // Postgres and Supabase are instantiated lazily on first access, so callers (and tests) that
  // don't use them, or that mock them out, never trigger a real DB connection or cookie read.
  return {
    get pool(): Pool {
      return getDbPool();
    },
    // Supabase must be re-created per request as it depends on cookies/JWT.
    get supabase() {
      return createSupabaseServerClient();
    },
    s3Handler: core.s3Handler,
    assetsBucket: core.assetsBucket,
    mapsRepo: core.mapsRepo,
    favoritesRepo: core.favoritesRepo,
  };
}

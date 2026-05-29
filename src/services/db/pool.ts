import { attachDatabasePool } from '@vercel/functions';
import pg from 'pg';
import { getEnvVars } from 'services/env';
import { getLog } from 'services/logging/server_logger';
import { getSingleton } from 'services/singleton';

const log = getLog(['db']);

// Returns the (lazily-created, memoized) connection pool. The pool is created synchronously and
// only opens a connection on first query, so callers that don't query — or that mock the DB —
// don't trigger a real connection.
export function getDbPool(maxConnections?: number) {
  return getSingleton('_dbPool', () => initPool(maxConnections));
}

function initPool(maxConnections?: number) {
  log.info('Initialising db pool connection');
  const envVars = getEnvVars();
  const pool = new pg.Pool({
    host: envVars.pgHost,
    port: envVars.pgPort,
    database: envVars.pgDatabase,
    user: envVars.pgUser,
    password: envVars.pgPassword,
    max: maxConnections,
  });
  pool.on('error', (error) => log.error('Could not initialise db pool connection', { error }));
  attachDatabasePool(pool);
  return pool;
}

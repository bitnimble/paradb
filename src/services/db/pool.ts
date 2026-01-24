import { attachDatabasePool } from '@vercel/functions';
import pg from 'pg';
import { getEnvVars } from 'services/env';
import { getLog } from 'services/logging/server_logger';
import { getSingleton } from 'services/singleton';

const log = getLog(['db']);

export async function getDbPool(maxConnections?: number) {
  return getSingleton('_dbPool', async () => {
    const pool = initPool(maxConnections);
    try {
      // Quickly test connection to check that DB is running
      const client = await pool.connect();
      client.release();
    } catch (e) {
      const envVars = getEnvVars();
      const message =
        'Could not connect to database, is it running? Connection string: ' +
        `postgresql://${envVars.pgUser}:<password>@${envVars.pgHost}:${envVars.pgPort}/${envVars.pgDatabase}\n${e}`;
      log.error(message);
      throw new Error(message);
    }
    return pool;
  });
}

function initPool(maxConnections?: number) {
  log.info('Initialising db pool connection');
  // Test DB
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

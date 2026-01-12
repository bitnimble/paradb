import { attachDatabasePool } from '@vercel/functions';
import pg from 'pg';
import { getEnvVars } from 'services/env';
import { getSingleton } from 'services/singleton';

export async function getDbPool(maxConnections?: number) {
  return getSingleton('_dbPool', async () => {
    const pool = initPool(maxConnections);
    try {
      // Quickly test connection to check that DB is running
      const client = await pool.connect();
      client.release();
    } catch (e) {
      const envVars = getEnvVars();
      throw new Error(
        'Could not connect to database, is it running? Connection string: ' +
          `postgresql://${envVars.pgUser}:<password>@${envVars.pgHost}:${envVars.pgPort}/${envVars.pgDatabase}\n${e}`
      );
    }
    return pool;
  });
}

function initPool(maxConnections?: number) {
  console.log('Initialising pg db pool connection');
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
  pool.on('error', (err) => console.error(err));
  attachDatabasePool(pool);
  return pool;
}

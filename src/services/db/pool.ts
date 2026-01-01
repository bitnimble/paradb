import pg from 'pg';
import { getEnvVars } from 'services/env';

const db: {
  pool: pg.Pool | undefined;
} = { pool: undefined };

export async function getDbPool(maxConnections?: number) {
  if (!db.pool) {
    db.pool = initPool(maxConnections);
    try {
      // Quickly test connection to check that DB is running
      const client = await db.pool.connect();
      client.release();
    } catch (e) {
      const envVars = getEnvVars();
      throw new Error(
        'Could not connect to database, is it running? Connection string: ' +
          `postgresql://${envVars.pgUser}:<password>@${envVars.pgHost}:${envVars.pgPort}/${envVars.pgDatabase}\n${e}`
      );
    }
  }
  return db.pool;
}

function initPool(maxConnections?: number) {
  console.log('Initialising pg db pool connection');
  // Test DB
  const envVars = getEnvVars();
  db.pool = new pg.Pool({
    host: envVars.pgHost,
    port: envVars.pgPort,
    database: envVars.pgDatabase,
    user: envVars.pgUser,
    password: envVars.pgPassword,
    min: maxConnections,
    max: maxConnections,
  });
  db.pool.on('error', (err) => console.error(err));
  return db.pool;
}

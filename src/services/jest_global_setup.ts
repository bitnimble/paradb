import { loadEnvConfig } from '@next/env';
import * as fs from 'fs/promises';
import * as path from 'path';
import pg from 'pg';
import { DatabaseError } from 'pg-protocol';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

/**
 * Creates the test database and applies the schema.
 * This runs once before the entire test suite, ensuring tests use a separate database
 * from the local dev environment.
 */
export default async function globalSetup() {
  const testDb = process.env.PGDATABASE;
  const host = process.env.PGHOST;
  const port = process.env.PGPORT;
  const user = process.env.PGUSER;
  const password = process.env.PGPASSWORD;

  if (!testDb || !host || !port || !user || !password) {
    throw new Error('Missing required PG* environment variables for test setup');
  }
  if (!/^[a-zA-Z0-9_]+$/.test(testDb)) {
    throw new Error(`Invalid test database name: ${testDb}`);
  }

  // Connect to the default `postgres` database to create the test database
  const adminPool = new pg.Pool({
    host,
    port: Number(port),
    database: 'postgres',
    user,
    password,
  });

  try {
    const exists = await adminPool.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [testDb]);
    if (exists.rows.length === 0) {
      await adminPool.query(`CREATE DATABASE "${testDb}"`);
    }
  } finally {
    await adminPool.end();
  }

  // Connect to the test database and apply the schema
  const testPool = new pg.Pool({
    host,
    port: Number(port),
    database: testDb,
    user,
    password,
  });

  try {
    const schemasDir = path.resolve(__dirname, '../../supabase/schemas');
    // Apply schemas in order matching supabase config.toml
    const schemaFiles = ['maps.sql', 'users.sql', 'favorites.sql', 'functions.sql', 'misc.sql'];
    for (const file of schemaFiles) {
      const filePath = path.join(schemasDir, file);
      try {
        const sql = await fs.readFile(filePath, 'utf-8');
        await testPool.query(sql);
      } catch (e: unknown) {
        // 42P07 = duplicate_table, 42710 = duplicate_object — schema already applied
        if (e instanceof DatabaseError && (e.code === '42P07' || e.code === '42710')) {
          continue;
        }
        console.warn(`Warning: failed to apply ${file}:`, e);
      }
    }
  } finally {
    await testPool.end();
  }
}

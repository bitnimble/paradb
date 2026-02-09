import { loadEnvConfig } from '@next/env';
import * as fs from 'fs/promises';
import * as path from 'path';
import pg from 'pg';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

/**
 * Creates the test database and applies the schema.
 * This runs once before the entire test suite, ensuring tests use a separate database
 * from the local dev environment.
 */
export default async function globalSetup() {
  const testDb = process.env.PGDATABASE!;
  const host = process.env.PGHOST!;
  const port = Number(process.env.PGPORT!);
  const user = process.env.PGUSER!;
  const password = process.env.PGPASSWORD!;

  // Connect to the default `postgres` database to create the test database
  const adminPool = new pg.Pool({
    host,
    port,
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
    port,
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
      } catch {
        // Schema already exists, skip
      }
    }
  } finally {
    await testPool.end();
  }
}

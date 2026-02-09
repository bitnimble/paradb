import { createClient } from '@supabase/supabase-js';
import { loadEnvConfig } from '@next/env';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Pool } from 'pg';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

/**
 * Ensures the database is in a clean state before the test suite runs.
 *
 * Tests run against a `paradb_test` schema in the local Supabase Postgres
 * instance, keeping any dev data in the default `public` schema untouched.
 *
 * This function:
 * 1. Creates the `paradb_test` schema (if it doesn't exist)
 * 2. Applies the table DDL from supabase/schemas/ into `paradb_test`
 * 3. Seeds the schema with test data from supabase/seed.sql
 * 4. Deletes any leftover Supabase Auth users from previous test runs
 */
export default async function globalSetup() {
  const pool = new Pool();

  // Create the test schema and set search_path so CREATE TABLE lands there
  await pool.query('CREATE SCHEMA IF NOT EXISTS paradb_test');
  await pool.query('SET search_path TO paradb_test, public');

  // Drop existing test tables (in reverse dependency order) for a clean slate
  await pool.query(`
    DROP TABLE IF EXISTS paradb_test.favorites CASCADE;
    DROP TABLE IF EXISTS paradb_test.difficulties CASCADE;
    DROP TABLE IF EXISTS paradb_test.users CASCADE;
    DROP TABLE IF EXISTS paradb_test.maps CASCADE;
  `);

  // Apply schema DDL files in dependency order
  const schemaDir = path.resolve(projectDir, 'supabase/schemas');
  const schemaFiles = ['maps.sql', 'users.sql', 'favorites.sql'];
  for (const file of schemaFiles) {
    const sql = await fs.readFile(path.join(schemaDir, file), 'utf-8');
    await pool.query(sql);
  }

  // Apply the functions.sql (e.g. check_email_exists) in public schema
  // since it queries auth.users which is schema-independent
  const functionsSql = await fs.readFile(path.join(schemaDir, 'functions.sql'), 'utf-8');
  await pool.query('SET search_path TO public');
  await pool.query(functionsSql);
  await pool.query('SET search_path TO paradb_test, public');

  // Seed with test data
  const seedSql = await fs.readFile(path.resolve(projectDir, 'supabase/seed.sql'), 'utf-8');
  await pool.query(seedSql);

  // Delete any leftover Supabase Auth users from previous test runs
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
  const { data } = await supabaseAdmin.auth.admin.listUsers();
  if (data?.users) {
    await Promise.all(
      data.users.map((user) => supabaseAdmin.auth.admin.deleteUser(user.id))
    );
  }

  await pool.end();
}

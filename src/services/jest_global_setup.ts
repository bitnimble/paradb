import { execSync } from 'child_process';
import { loadEnvConfig } from '@next/env';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

/**
 * Resets the local Supabase database before the test suite runs.
 * Uses `supabase db reset` which applies migrations, schemas, and seeds.
 */
export default async function globalSetup() {
  console.log('Resetting Supabase database for tests...');
  execSync('bun supabase db reset --yes', {
    cwd: projectDir,
    stdio: 'inherit',
  });
}

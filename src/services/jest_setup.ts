import { execSync } from 'child_process';
import { loadEnvConfig } from '@next/env';
import { getServerContext } from 'services/server_context';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

beforeEach(async () => {
  if (process.env.NODE_ENV === 'production' || (process.env.NODE_ENV as string) === 'prod') {
    throw new Error('Almost dropped DB on prod env');
  }
  execSync('bun supabase db reset', {
    cwd: projectDir,
    stdio: 'inherit',
  });
});
afterAll(async () => {
  const { pool } = await getServerContext();
  await pool.end();
});

global.console.info = jest.fn();

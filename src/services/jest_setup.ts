import { loadEnvConfig } from '@next/env';
import * as fs from 'fs/promises';
import * as path from 'path';
import { getServerContext } from 'services/server_context';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

async function initTestData() {
  const { pool } = await getServerContext();
  const initialDataSqlPath = path.resolve(__dirname, '../../db/fake_data.sql');
  const initialDataSql = await fs.readFile(initialDataSqlPath).then((b) => b.toString());
  await pool.query(`
TRUNCATE maps, difficulties, users, favorites CASCADE;
${initialDataSql}
`);
}

beforeEach(async () => {
  // TODO: figure out a better way to do this now that Next and Jest don't run in the same server
  // context.
  if (process.env.NODE_ENV === 'production' || (process.env.NODE_ENV as string) === 'prod') {
    throw new Error('Almost dropped DB on prod env');
  }
  await initTestData();
});
afterAll(async () => {
  const { pool } = await getServerContext();
  await pool.end();
});

global.console.info = jest.fn();

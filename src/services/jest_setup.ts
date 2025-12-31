import { loadEnvConfig } from '@next/env';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { getServerContext } from 'services/server_context';

let tmpMapsDir: string | undefined;

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

beforeAll(async () => {
  if (tmpMapsDir == null) {
    tmpMapsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'paradb_test_'));
    process.env = { ...process.env, MAPS_DIR: tmpMapsDir };
  }
});
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
  if (tmpMapsDir) {
    fs.rm(tmpMapsDir, { recursive: true, force: true });
  }
});

global.console.info = jest.fn();

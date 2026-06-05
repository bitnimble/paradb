import * as fs from 'fs/promises';
import * as path from 'path';
import { MemoryFakeS3Handler } from 'services/maps/s3_handler_fake_memory';
import { getServerContext } from 'services/server_context';
import { _setCurrentUserForTesting } from 'services/session/supabase_fake';

async function initTestData() {
  const { pool } = getServerContext();
  const seedSqlPath = path.resolve(__dirname, '../../supabase/seed.sql');
  const seedSql = await fs.readFile(seedSqlPath).then((b) => b.toString());
  await pool.query(`
TRUNCATE maps, difficulties, users, favorites CASCADE;
${seedSql}
`);
}

beforeEach(async () => {
  // TODO: figure out a better way to do this now that Next and Jest don't run in the same server
  // context.
  if (process.env.NODE_ENV === 'production' || (process.env.NODE_ENV as string) === 'prod') {
    throw new Error('Almost dropped DB on prod env');
  }
  _setCurrentUserForTesting(null);
  const { s3Handler } = getServerContext();
  if (s3Handler instanceof MemoryFakeS3Handler) {
    s3Handler._resetForTesting();
  }
  await initTestData();
});
afterAll(async () => {
  const { pool } = getServerContext();
  await pool.end();
});

global.console.info = jest.fn();

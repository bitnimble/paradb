import dotenv from 'dotenv';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { getServerContext } from 'services/server_context';

let tmpMapsDir: string | undefined;

dotenv.config({ path: process.env.ENV_FILE });

async function initTestData() {
  const { pool } = await getServerContext();
  await pool.query(`
TRUNCATE maps, difficulties, users, favorites CASCADE;
INSERT INTO maps
  (id, submission_date, title, artist, author, uploader, download_count, description, complexity, album_art)
VALUES
  ('1', timestamp '2021-06-01 00:00:00', 'All Star', 'Smash Mouth', 'anon', 'anon', 0, 'All Star is the greatest hit of all time.', 2, 'https://upload.wikimedia.org/wikipedia/en/3/30/Astro_lounge.png'),
  ('2', timestamp '2021-06-01 00:00:00', 'All Star 2', 'Smash Mouth 2', 'anon', 'anon', 0, 'All Star is the greatest hit of all time.', 2, 'https://upload.wikimedia.org/wikipedia/en/3/30/Astro_lounge.png');

INSERT INTO difficulties
  (map_id, difficulty, difficulty_name)
VALUES
  ('1', null, 'anon''s Easy'),
  ('1', null, 'Medium'),
  ('1', null, 'This map has layers'),
  ('1', null, 'Shrek is love, Shrek is life'),
  ('2', null, 'Easy'),
  ('2', null, 'Medium'),
  ('2', null, 'Hard'),
  ('2', null, 'Expert');
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

import { Browser, chromium } from '@playwright/test';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { deflateSync } from 'zlib';

// Drives the profile-picture upload UI end to end in a real browser against the integration server
// (PGlite + fake Supabase + fake S3, served via tools/test.sh). Uses the Playwright library rather
// than its test runner so it lives in the Jest integration suite; assertions are Jest + manual
// Playwright waits (the runner's web-first matchers aren't available here).

const BASE_URL = 'http://localhost:3000';
const PASSWORD = 'quartz-meadow-7Vx-galleon';
const AVATAR_IMG = 'img[src*="/avatars/"]';

jest.setTimeout(60_000);

// Minimal solid-grey RGB PNG, so the test has a real browser-decodable image without committing a
// binary fixture.
function crc32(buf: Buffer): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]!;
    for (let k = 0; k < 8; k++) {
      c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
  }
  return ~c >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

function makePng(size: number): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(size * 3, 0x4c)]); // filter byte + pixels
  const raw = Buffer.concat(Array.from({ length: size }, () => row));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

const avatarLoaded = (): boolean => {
  const img = document.querySelector<HTMLImageElement>('img[src*="/avatars/"]');
  return img != null && img.complete && img.naturalWidth > 0;
};

describe('profile picture upload (browser)', () => {
  let browser: Browser;
  let fixturePath: string;

  beforeAll(async () => {
    browser = await chromium.launch();
    // Date.now is fine here (a normal Jest test, not a workflow script).
    fixturePath = path.join(os.tmpdir(), `paradb-avatar-${Date.now()}.png`);
    await fs.writeFile(fixturePath, makePng(64));
  });

  afterAll(async () => {
    await browser?.close();
    if (fixturePath != null) {
      await fs.rm(fixturePath, { force: true });
    }
  });

  it('uploads, crops, and renders the avatar in the header', async () => {
    const context = await browser.newContext({ baseURL: BASE_URL });
    const page = await context.newPage();
    try {
      const username = `pic_${Date.now().toString(36)}`;

      // Sign up. The fake Supabase sets the session cookie on signup, so we land authenticated even
      // though the UI routes to the email-verification notice.
      await page.goto('/signup');
      await page.getByLabel('Username').fill(username);
      await page.getByLabel('Email').fill(`${username}@example.com`);
      await page.getByLabel('Password').fill(PASSWORD);
      await page.getByRole('button', { name: 'Signup' }).click();
      // Signup sets the session cookie and navigates away from /signup (to the verification notice,
      // which redirects an already-authenticated user home).
      await page.waitForURL((url) => !url.pathname.startsWith('/signup'));

      await page.goto('/settings');
      await page.waitForSelector(`text=Logged in as ${username}`);
      // No avatar yet.
      expect(await page.locator(AVATAR_IMG).count()).toBe(0);

      // Upload the fixture, then crop with nearest-neighbour ("Precise") scaling.
      await page.locator('input[type="file"]').setInputFiles(fixturePath);
      await page.waitForSelector('text=Crop your profile picture');
      await page.getByText('Precise').click();
      await page.getByRole('button', { name: 'Save' }).click();

      // The avatar appears and the image actually loads from the dev S3 route (fake bucket).
      await page.waitForFunction(avatarLoaded);

      // Survives a reload (token persisted in the session, bytes served from the fake bucket).
      await page.reload();
      await page.waitForFunction(avatarLoaded);

      // Output is the fixed 512px square regardless of the source size.
      const naturalWidth = await page
        .locator(AVATAR_IMG)
        .first()
        .evaluate((img: HTMLImageElement) => img.naturalWidth);
      expect(naturalWidth).toBe(512);
    } finally {
      await context.close();
    }
  });
});

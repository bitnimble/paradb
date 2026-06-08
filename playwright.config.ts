import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

/**
 * Full-stack E2E config. These tests need the real Supabase stack + Minio already running and the
 * env from .env.e2e (both orchestrated by tools/e2e.sh / `bun run test:e2e`). Playwright itself only
 * boots the Next dev server via `webServer`.
 *
 * The suite is a single stateful user journey (one user uploads, a second sees it), so it runs
 * serially in one worker with no retries - a retry would replay signups and duplicate state.
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.e2e.ts',
  tsconfig: './e2e/tsconfig.json',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  // Generous per-test budget: the journey polls Inbucket for the confirmation email and does real
  // uploads/downloads against S3.
  timeout: 120_000,
  expect: { timeout: 15_000 },
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'bun next dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});

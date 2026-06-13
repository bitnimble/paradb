import { expect, Locator, Page, test } from '@playwright/test';
import { makeUser, signUpAndConfirm } from './helpers/auth';
import { deleteSeededMaps, seedPublicMaps } from './helpers/seed';

// SEARCH_LIMIT in src/app/map_list_presenter.ts.
const PAGE_SIZE = 20;
const TOTAL = 25;

// Process-unique artist so re-runs against the persisted Supabase DB never collide; one seeded set
// is shared by both tests.
const unique = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
const artist = `infscroll${unique}`;

// One row per map (each row links to /map/{id}); excludes the header and loading skeleton.
const mapRows = (page: Page) => page.locator('tr', { has: page.locator('a[href^="/map/"]') });

const nextPageResponse = (page: Page) =>
  page.waitForResponse(
    (r) =>
      r.url().includes('/api/maps') &&
      r.request().method() === 'GET' &&
      new URL(r.url()).searchParams.get('offset') === String(PAGE_SIZE),
    { timeout: 15_000 }
  );

// Opens the list scoped (by the run-unique artist) to exactly this run's maps and asserts the
// first page rendered with "Load more" on offer.
async function openFirstPage(page: Page): Promise<{ rows: Locator; loadMore: Locator }> {
  const rows = mapRows(page);
  await page.goto(`/?q=${artist}`);
  await page.waitForResponse(
    (r) => r.url().includes('/api/maps') && r.request().method() === 'GET'
  );
  await expect(rows).toHaveCount(PAGE_SIZE);
  const loadMore = page.getByRole('button', { name: 'Load more' });
  await expect(loadMore).toBeVisible();
  return { rows, loadMore };
}

// Asserts the second page got appended: every map present exactly once, nothing more to load.
async function expectAllLoaded(rows: Locator, loadMore: Locator): Promise<void> {
  await expect(rows).toHaveCount(TOTAL);
  await expect(loadMore).toHaveCount(0);
  const ids = await rows.evaluateAll((trs) =>
    trs.map((tr) => tr.querySelector('a[href^="/map/"]')?.getAttribute('href'))
  );
  expect(new Set(ids).size).toBe(TOTAL);
}

// Parks the mouse over the (visible) centre of the map list table so wheel events scroll the list's
// container. Clamped into the viewport since a full page of rows overflows it.
async function moveMouseToTableCentre(page: Page): Promise<void> {
  const table = page.locator('table', { has: page.locator('a[href^="/map/"]') });
  const box = await table.boundingBox();
  const viewport = page.viewportSize();
  if (box == null || viewport == null) {
    throw new Error('could not locate the map list table');
  }
  // Centre of the table's visible region (the table is taller than the viewport).
  const visibleTop = Math.max(box.y, 0);
  const visibleBottom = Math.min(box.y + box.height, viewport.height);
  const cx = Math.min(Math.max(box.x + box.width / 2, 1), viewport.width - 1);
  const cy = (visibleTop + visibleBottom) / 2;
  await page.mouse.move(cx, cy);
}

// Scrolls the wheel over the table until the next page has loaded (the row count grows past the
// first page) - i.e. the infinite-scroll hook reached the bottom and appended the next page. The
// wheel scrolls the layout skeleton container (the list's scroll parent). We key off the row count
// rather than the button's loading/disabled state, which is too transient to observe reliably when
// the fetch is fast.
async function wheelUntilNextPageLoads(page: Page, rows: Locator): Promise<void> {
  await moveMouseToTableCentre(page);
  for (let i = 0; i < 40; i++) {
    await page.mouse.wheel(0, 400);
    if ((await rows.count()) > PAGE_SIZE) {
      return;
    }
    await page.waitForTimeout(150); // let the hook's 150ms scroll debounce + the fetch run
  }
  throw new Error('scrolling to the bottom did not load the next page');
}

test.describe('home page infinite scroll', () => {
  // A dedicated, authenticated page seeds the maps once over the real API; both tests share them.
  let seedPage: Page;
  let seededIds: string[];

  test.beforeAll(async ({ browser }) => {
    seedPage = await browser.newPage();
    await signUpAndConfirm(seedPage, makeUser('isscroll'));
    seededIds = (await seedPublicMaps(seedPage, { artist, count: TOTAL })).map((m) => m.id);
  });

  test.afterAll(async () => {
    await deleteSeededMaps(seedPage, seededIds);
    await seedPage.close();
  });

  test('appends the next page when "Load more" is clicked', async ({ page }) => {
    const { rows, loadMore } = await openFirstPage(page);
    await Promise.all([nextPageResponse(page), loadMore.click()]);
    await expectAllLoaded(rows, loadMore);
  });

  test('appends the next page when the mouse wheel reaches the bottom', async ({ page }) => {
    const { rows, loadMore } = await openFirstPage(page);
    await wheelUntilNextPageLoads(page, rows);
    await expectAllLoaded(rows, loadMore);
  });
});

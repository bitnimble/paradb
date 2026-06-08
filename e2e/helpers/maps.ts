import { expect, Locator, Page } from '@playwright/test';
import { MapFixture } from '../fixtures';

/**
 * Uploads a map through the real submit flow (presigned PUT to S3 + server-side validation) and
 * returns the new map's id, parsed from the post-upload redirect to /map/{id}.
 */
export async function uploadMap(page: Page, fixture: MapFixture): Promise<string> {
  await page.goto('/map/submit');
  await page.locator('input[type="file"]').setInputFiles(fixture.zipPath);
  await page.getByRole('button', { name: 'Submit' }).click();

  // On success the presenter routes to the new map page; /map/submit is the only other /map/* path.
  await page.waitForURL(
    (url) => /^\/map\/[^/]+$/.test(url.pathname) && !url.pathname.endsWith('/submit'),
    {
      timeout: 60_000,
    }
  );
  const id = new URL(page.url()).pathname.split('/').pop()!;
  // exact: true so we match the title heading, not Next's route announcer ("<title> - ParaDB").
  await expect(page.getByText(fixture.title, { exact: true })).toBeVisible();
  return id;
}

/** The home-page table row for a given map, located by its /map/{id} link. */
export function mapRow(page: Page, id: string): Locator {
  return page.locator('tr', { has: page.locator(`a[href="/map/${id}"]`) });
}

/** The favorites cell (5th column) of a map's row. */
export function favoritesCell(page: Page, id: string): Locator {
  return mapRow(page, id).locator('td').nth(4);
}

/** Runs a free-text search from the home page and waits for the results to load. */
export async function searchMaps(page: Page, query: string) {
  await page.getByPlaceholder('Search for a song or artist...').fill(query);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/maps') && r.request().method() === 'GET'),
    page.getByRole('button', { name: 'Search' }).click(),
  ]);
}

/** Opens the advanced-filter panel, sets one simple field, and applies the search. */
export async function applySimpleFilter(page: Page, label: string, value: string) {
  if (
    !(await page
      .getByLabel(label)
      .isVisible()
      .catch(() => false))
  ) {
    await page.getByRole('button', { name: 'Toggle filters' }).click();
  }
  await page.getByLabel(label).fill(value);
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/maps') && r.request().method() === 'GET'),
    page.getByRole('button', { name: 'Search' }).click(),
  ]);
}

/** Resets the home page to a clean, unfiltered state. */
export async function goHome(page: Page) {
  await page.goto('/');
  await page.waitForResponse(
    (r) => r.url().includes('/api/maps') && r.request().method() === 'GET'
  );
}

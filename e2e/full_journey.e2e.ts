import { expect, Page, test } from '@playwright/test';
import { MAP_ONE, MAP_TWO, MapFixture } from './fixtures';
import {
  expectLoggedOut,
  login,
  logout,
  makeUser,
  signUpAndConfirm,
  TestUser,
} from './helpers/auth';
import {
  applySimpleFilter,
  favoritesCell,
  goHome,
  mapRow,
  searchMaps,
  uploadMap,
} from './helpers/maps';
import { assertZipMatchesFixture } from './helpers/zip';

async function favoriteMap(page: Page) {
  // The favorite button only renders once the map's userProjection has loaded; wait for it so a
  // missing projection fails loudly here rather than as an opaque click timeout.
  const favorite = page.getByRole('button', { name: '❤' });
  await expect(favorite).toBeVisible();
  await Promise.all([
    page.waitForResponse(
      (r) => r.url().includes('/api/favorites') && r.request().method() === 'POST'
    ),
    favorite.click(),
  ]);
}

async function downloadAndVerify(page: Page, id: string, fixture: MapFixture) {
  const resp = await page.request.get(`/api/maps/${id}/download`);
  expect(resp.ok()).toBeTruthy();
  await assertZipMatchesFixture(await resp.body(), fixture);
}

// One long, stateful journey across two users; runs as a single ordered test so the shared state
// (the uploaded maps, the favorite counts) flows naturally between steps.
test('full happy-path journey across two users', async ({ page }) => {
  test.setTimeout(300_000);

  const user1: TestUser = makeUser('one');
  const user2: TestUser = makeUser('two');
  let map1Id = '';
  let map2Id = '';

  await test.step('load homepage', async () => {
    await page.goto('/');
    await expect(page.getByPlaceholder('Search for a song or artist...')).toBeVisible();
    await expectLoggedOut(page);
  });

  await test.step('sign up (with email confirmation), log out, log back in', async () => {
    await signUpAndConfirm(page, user1);
    await logout(page);
    await login(page, user1);
  });

  await test.step('upload a map and land on its page', async () => {
    map1Id = await uploadMap(page, MAP_ONE);
    await expect(page.getByText(MAP_ONE.artist)).toBeVisible();
  });

  await test.step('map page shows owner actions for the uploader', async () => {
    await expect(page.getByRole('button', { name: 'Delete' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reupload' })).toBeVisible();
  });

  await test.step('favorite and download the map as the owner', async () => {
    await favoriteMap(page);
    await downloadAndVerify(page, map1Id, MAP_ONE);
  });

  await test.step('homepage lists the new map with 1 favorite', async () => {
    await goHome(page);
    await searchMaps(page, MAP_ONE.title);
    await expect(mapRow(page, map1Id)).toBeVisible();
    await expect(favoritesCell(page, map1Id)).toHaveText('1');
  });

  await test.step('log out and sign up as a second user', async () => {
    await logout(page);
    await signUpAndConfirm(page, user2);
  });

  await test.step('second user sees the map and opens it (no owner actions)', async () => {
    await goHome(page);
    await searchMaps(page, MAP_ONE.title);
    await expect(mapRow(page, map1Id)).toBeVisible();
    await mapRow(page, map1Id).locator('a').first().click();
    await page.waitForURL(`**/map/${map1Id}`);

    await expect(page.getByText(MAP_ONE.title)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Reupload' })).toHaveCount(0);
  });

  await test.step('second user favorites and downloads the map', async () => {
    await favoriteMap(page);
    await downloadAndVerify(page, map1Id, MAP_ONE);
  });

  await test.step('homepage now shows 2 favorites', async () => {
    await goHome(page);
    await searchMaps(page, MAP_ONE.title);
    await expect(favoritesCell(page, map1Id)).toHaveText('2');
  });

  await test.step('second user uploads a second, distinct map', async () => {
    map2Id = await uploadMap(page, MAP_TWO);
  });

  await test.step('search finds each map by its distinct title', async () => {
    await goHome(page);
    await searchMaps(page, MAP_ONE.title);
    await expect(mapRow(page, map1Id)).toBeVisible();
    await expect(mapRow(page, map2Id)).toHaveCount(0);

    await goHome(page);
    await searchMaps(page, MAP_TWO.title);
    await expect(mapRow(page, map2Id)).toBeVisible();
    await expect(mapRow(page, map1Id)).toHaveCount(0);
  });

  await test.step('artist / mapper / description filters select the right map', async () => {
    for (const [label, value] of [
      ['Artist', MAP_ONE.artist],
      ['Mapper', MAP_ONE.mapper],
      ['Description', MAP_ONE.description],
    ] as const) {
      await goHome(page);
      await applySimpleFilter(page, label, value);
      await expect(mapRow(page, map1Id), `${label} filter should include map one`).toBeVisible();
      await expect(mapRow(page, map2Id), `${label} filter should exclude map two`).toHaveCount(0);
    }
  });
});

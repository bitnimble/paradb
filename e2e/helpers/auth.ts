import { expect, Page } from '@playwright/test';
import { getConfirmationLink } from './inbucket';

export type TestUser = {
  username: string;
  email: string;
  password: string;
};

// Strong, fixed password (zxcvbn-friendly) with no overlap with the generated usernames/emails.
const PASSWORD = 'quartz-meadow-7Vx-galleon';

/** A fresh user with a process-unique username/email so re-runs never collide in the persisted DB. */
export function makeUser(label: string): TestUser {
  const unique = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
  return {
    username: `e2e_${label}_${unique}`,
    email: `e2e_${label}_${unique}@example.com`,
    password: PASSWORD,
  };
}

export async function expectLoggedIn(page: Page, username: string) {
  await expect(page.getByText(`Logged in as ${username}`)).toBeVisible();
}

export async function expectLoggedOut(page: Page) {
  await expect(page.getByRole('link', { name: 'Login' })).toBeVisible();
}

/**
 * Signs a brand-new user up through the real form, then completes email confirmation by following
 * the link from the local mail catcher. Confirmation establishes a session, so the user lands logged
 * in on the home page.
 */
export async function signUpAndConfirm(page: Page, user: TestUser) {
  await page.goto('/signup');
  await page.getByLabel('Username').fill(user.username);
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Signup' }).click();

  // Confirmations are on, so the form routes to the verification notice rather than logging in.
  await page.waitForURL('**/signup/email-verification');
  await expect(page.getByText('Email verification needed', { exact: true })).toBeVisible();

  const confirmLink = await getConfirmationLink(user.email);
  // Visiting the link verifies the OTP server-side, sets the session cookies, and redirects to the
  // site root - so the user ends up logged in on the home page.
  await page.goto(confirmLink);
  await page.waitForURL((url) => url.pathname === '/');

  await expectLoggedIn(page, user.username);
}

export async function login(page: Page, user: TestUser) {
  await page.goto('/login');
  await page.getByLabel('Username/email').fill(user.username);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', { name: 'Login' }).click();

  // The presenter does a full navigation to the home page once the session is set.
  await page.waitForURL((url) => url.pathname === '/');
  await expectLoggedIn(page, user.username);
}

export async function logout(page: Page) {
  await page.getByRole('link', { name: 'Logout' }).click();
  await expectLoggedOut(page);
}

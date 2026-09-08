import { expect, test } from '@playwright/test';

// W01 replaced session 0.8's placeholder home, so the smoke test is now
// about the page a reader actually lands on.

test('the header and footer frame every page', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('banner').getByRole('link', { name: 'curb' })).toBeVisible();
  await expect(page.getByRole('contentinfo')).toContainText('hello@curbsocial.club');
});

test('an unknown address renders the not-found boundary', async ({ page }) => {
  const response = await page.goto('/nothing-here');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1, name: 'Not found' })).toBeVisible();
});

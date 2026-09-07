import { expect, test } from '@playwright/test';

test('home renders the wordmark, the copy, and the API status line', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'curb' })).toBeVisible();
  await expect(page.getByText('Local car meets in coastal Orange County')).toBeVisible();
  await expect(page.getByTestId('api-status')).toContainText(/^API .+: (reachable|unreachable)$/);
  await expect(page).toHaveTitle('Curb Social Club');
});

test('an unknown address renders the not-found boundary', async ({ page }) => {
  const response = await page.goto('/nothing-here');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1, name: 'Not found' })).toBeVisible();
});

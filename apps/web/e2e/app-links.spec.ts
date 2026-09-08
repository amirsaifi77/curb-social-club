import { expect, test } from '@playwright/test';

// AC-6 and AC-7 are about a phone, and the user agent is what both the
// server and the click handler branch on, so each test builds the context
// carrying the string it needs.

test.describe('deep links and the in-app bar', () => {

  test('AC-6: on an iPhone the href is the app itself, before any script runs', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
      javaScriptEnabled: false,
    });
    const page = await context.newPage();
    await page.goto('/meets/lido-saturday');

    // R-10 wants the scheme tried first. With the store URL in the href, a
    // tap before hydration went straight to the App Store, and no timing
    // assertion could tell that from a slow machine.
    await expect(page.getByRole('link', { name: "I'm going" })).toHaveAttribute(
      'href',
      'curb://meets/lido-saturday',
    );
    await context.close();
  });

  test('AC-6: the App Store is the fallback, not the first stop', async ({ browser }) => {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    });
    const page = await context.newPage();
    await context.route('https://apps.apple.com/**', (route) =>
      route.fulfill({ status: 200, body: 'store' }),
    );

    await page.goto('/meets/lido-saturday');
    // Wait for hydration, so this measures the handler and not the race.
    await expect(page.getByTestId('hydrated')).toBeAttached();
    await page.getByRole('link', { name: "I'm going" }).click();

    await page.waitForURL(/apps\.apple\.com/, { timeout: 10_000 });
    await context.close();
  });

  test('R-10: off iOS the anchor is the store, since the app is not there', async ({ page }) => {
    await page.goto('/meets/lido-saturday');
    const link = page.getByRole('link', { name: "I'm going" });

    await expect(link).toHaveAttribute('href', 'https://apps.apple.com/app/id6740000000');
    await expect(link).toHaveAttribute('data-app-path', 'meets/lido-saturday');
  });

  test('R-19: a cancelled date does not offer a CTA that acts', async ({ page }) => {
    await page.goto('/meets/fontana-sunday');

    await expect(page.getByRole('link', { name: "I'm going" })).toHaveCount(0);
    await expect(page.getByText("I'm going")).toHaveAttribute('aria-disabled', 'true');
  });

  test('AC-7: the Open in app bar shows for Instagram, and stays gone once dismissed', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 320.0.0.19.108',
    });
    const page = await context.newPage();

    await page.goto('/meets/lido-saturday');
    const bar = page.getByTestId('open-in-app');
    await expect(bar).toBeVisible();
    await expect(bar.getByRole('link', { name: 'Open in curb' })).toBeVisible();

    await bar.getByRole('button', { name: 'Dismiss' }).click();
    await expect(bar).toBeHidden();

    // R-11: seven days, in localStorage, so it stays gone across reloads.
    await page.reload();
    await expect(page.getByTestId('open-in-app')).toHaveCount(0);

    await context.close();
  });

  test('R-11: an ordinary Safari reader never sees the bar', async ({ browser }) => {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    });
    const page = await context.newPage();

    await page.goto('/meets/lido-saturday');
    await expect(page.getByTestId('open-in-app')).toHaveCount(0);

    await context.close();
  });
});

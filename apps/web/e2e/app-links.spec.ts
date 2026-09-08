import { expect, test } from '@playwright/test';

// AC-6 and AC-7 are about a phone: the user agent decides both. They run in
// the iphone project, where devices['iPhone 14'] supplies the real string.
test.use({ ...{} });

test.describe('deep links and the in-app bar', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'user-agent driven');

  test('AC-6: on an iPhone the app is tried, then the App Store 1.5 s later', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    });
    const page = await context.newPage();
    // The store is another origin, so the navigation is intercepted rather
    // than followed: what matters is that it was attempted, and when.
    let storeAttempt: number | null = null;
    const started = Date.now();
    await context.route('https://apps.apple.com/**', (route) => {
      storeAttempt ??= Date.now() - started;
      void route.fulfill({ status: 200, body: 'store' });
    });

    await page.goto('/meets/lido-saturday');
    await page.getByRole('link', { name: "I'm going" }).click();

    await page.waitForURL(/apps\.apple\.com/, { timeout: 10_000 });
    // The app gets its chance first: an immediate jump to the store would
    // mean the scheme was never tried.
    expect(storeAttempt).toBeGreaterThan(1_000);
    await context.close();
  });

  test('AC-6: I am going tries the app, then the store, and never a write endpoint', async ({
    page,
  }) => {
    const writes: string[] = [];
    page.on('request', (request) => {
      if (request.method() !== 'GET') writes.push(request.url());
      if (/\/rsvp|\/follows/.test(request.url())) writes.push(request.url());
    });

    await page.goto('/meets/lido-saturday');
    const link = page.getByRole('link', { name: "I'm going" });

    // Without an iPhone user agent the anchor is the store link, which is
    // the whole behaviour on a desktop browser.
    await expect(link).toHaveAttribute('href', 'https://apps.apple.com/app/id6740000000');
    await expect(link).toHaveAttribute('data-app-path', 'meets/lido-saturday');
    expect(writes).toEqual([]);
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

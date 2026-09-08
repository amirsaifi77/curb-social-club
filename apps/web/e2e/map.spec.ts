import { expect, test } from '@playwright/test';

// web.md AC-11: the map loads, asks the API once for the box it settled on,
// and the side list matches what is in view.

test.describe('W05 map', () => {
  test('AC-11: one request after the move settles, and a list beside the map', async ({ page }) => {
    const mapRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/v1/events/map')) mapRequests.push(request.url());
    });

    await page.goto('/map');

    // R-15: 300 ms after move end, so an idle map asks nothing and a pan
    // asks once rather than once per frame.
    await expect
      .poll(() => mapRequests.length, { timeout: 10_000 })
      .toBeGreaterThan(0);
    await expect(page.getByRole('link', { name: 'Lido Saturday' })).toBeVisible();

    // R-15: the side list is every event in view, not only the pins that
    // happened not to cluster.
    await expect(page.locator('aside li')).toHaveCount(40);

    // Clusters render on the map itself: forty pins at this zoom draw far
    // fewer markers than forty.
    const markers = page.locator('[data-map-feature]');
    await expect.poll(() => markers.count(), { timeout: 10_000 }).toBeGreaterThan(0);
    expect(await markers.count()).toBeLessThan(40);
    await expect(page.locator('[data-map-feature="cluster"]').first()).toBeVisible();

    // The box it asked for is the one it settled on, sent as w,s,e,n.
    expect(mapRequests[0]).toMatch(/bbox=-?\d+(\.\d+)?%2C-?\d+(\.\d+)?%2C-?\d+(\.\d+)?%2C-?\d+/);
  });

  test('R-15: the map is not an address worth indexing', async ({ page }) => {
    await page.goto('/map');

    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  });
});

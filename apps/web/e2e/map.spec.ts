import { expect, test } from '@playwright/test';

// web.md AC-11: the map loads, asks the API once for the box it settled on,
// and the side list matches what is in view.

test.describe('W05 map', () => {
  test('AC-11: one request per settle, another after a pan, and a list beside the map', async ({
    page,
  }) => {
    const mapRequests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/v1/events/map')) mapRequests.push(request.url());
    });

    await page.goto('/map');
    await expect.poll(() => mapRequests.length, { timeout: 10_000 }).toBe(1);

    // R-15: 300 ms after the move settles, so a drag is one request rather
    // than one per frame. Nothing more arrives while the map sits still.
    await page.waitForTimeout(1_000);
    expect(mapRequests).toHaveLength(1);

    // R-15: the side list is every event in view.
    await expect(page.locator('aside li')).toHaveCount(40);
    await expect(page.getByRole('link', { name: 'Lido Saturday' })).toBeVisible();

    // Clusters render: forty pins at this zoom draw far fewer markers.
    const markers = page.locator('[data-map-feature]');
    await expect.poll(() => markers.count(), { timeout: 10_000 }).toBeGreaterThan(0);
    expect(await markers.count()).toBeLessThan(40);
    await expect(page.locator('[data-map-feature="cluster"]').first()).toBeVisible();

    // AC-11: the map is panned, and asks again for the box it settled on.
    // Three jumps in a row, which is what a drag looks like to the map: the
    // 300 ms settle has to coalesce them into one request, or a drag across
    // the county is one request per frame.
    await page.evaluate(() => {
      const map = (window as unknown as { __map?: { jumpTo: (o: { center: [number, number] }) => void } })
        .__map;
      map?.jumpTo({ center: [-117.6, 33.8] });
      map?.jumpTo({ center: [-117.4, 34.0] });
      map?.jumpTo({ center: [-117.2, 34.2] });
    });
    // The settle is a wait, not just a coalesce: nothing goes out in the
    // first 150 ms, and the request has arrived by 600.
    await page.waitForTimeout(150);
    expect(mapRequests).toHaveLength(1);
    await expect.poll(() => mapRequests.length, { timeout: 600 }).toBe(2);
    expect(mapRequests[1]).not.toBe(mapRequests[0]);

    // And nothing more once it settles.
    await page.waitForTimeout(1_000);
    expect(mapRequests).toHaveLength(2);
  });

  test('R-15: the map is not an address worth indexing', async ({ page }) => {
    await page.goto('/map');

    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  });
});

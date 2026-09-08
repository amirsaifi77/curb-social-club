import { expect, test } from '@playwright/test';

// web.md AC-14, AC-15, AC-19: the three files nobody reads as a page, and
// the two pages that answer for an address that is not there.

test.describe('W15', () => {
  test('AC-14: the sitemap lists the cities and every row the API gave', async ({ request }) => {
    const response = await request.get('/sitemap.xml');

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/xml');
    expect(response.headers()['cache-control']).toContain('s-maxage=3600');

    const xml = await response.text();
    expect(xml).toContain('<loc>https://curbsocial.club/</loc>');
    expect(xml).toContain('<loc>https://curbsocial.club/socal/newport-beach</loc>');
    expect(xml).toContain('<loc>https://curbsocial.club/meets/lido-saturday</loc>');
    expect(xml).toContain('<loc>https://curbsocial.club/clubs/back-bay-air-cooled</loc>');
    // AC-3's other half: an unlisted meet is absent, because the API only
    // returns public rows.
    expect(xml).not.toContain('secret-meet');
  });

  test('AC-14: robots allows the site, disallows the machinery, names the sitemap', async ({
    request,
  }) => {
    const robots = await (await request.get('/robots.txt')).text();

    expect(robots).toContain('Allow: /');
    expect(robots).toContain('Disallow: /map');
    expect(robots).toContain('Disallow: /og/');
    expect(robots).toContain('Sitemap: https://curbsocial.club/sitemap.xml');
  });

  test('AC-15: the AASA is JSON, served without a redirect', async ({ request }) => {
    const response = await request.get('/.well-known/apple-app-site-association', {
      maxRedirects: 0,
    });

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
    expect(response.headers()['location']).toBeUndefined();

    const body = (await response.json()) as {
      applinks: { details: { appID: string; components: { '/': string }[] }[] };
      webcredentials: { apps: string[] };
    };
    expect(body.applinks.details[0]?.appID).toBe('ABCDE12345.club.curbsocial.app');
    expect(body.webcredentials.apps).toContain('ABCDE12345.club.curbsocial.app');
    expect(body.applinks.details[0]?.components.map((row) => row['/'])).toContain('/meets/*');
  });
});

test.describe('AC-19: the pages for an address that is not there', () => {
  test('a slug nobody has is a 404 with nearby meets and the header', async ({ page }) => {
    const response = await page.goto('/meets/nothing-here');

    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Not found.');
    await expect(page.getByRole('banner')).toBeVisible();
    // R-21: up to three, from the feed near the reader.
    await expect(page.getByRole('link', { name: 'Lido Saturday' }).first()).toBeVisible();
  });

  test('a retired meet is a 410 with the rows the API sent', async ({ page }) => {
    const response = await page.goto('/meets/gone-meet');

    expect(response?.status()).toBe(410);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'This meet is no longer listed.',
    );
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Lido Saturday' }).first()).toBeVisible();
  });

  test('an address off any route is the same 404 page', async ({ page }) => {
    const response = await page.goto('/nothing/at/all');

    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Not found.');
  });
});

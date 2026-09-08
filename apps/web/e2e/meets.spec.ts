import { expect, test } from '@playwright/test';

// docs/specs/web.md AC-1 to AC-4, AC-6, AC-7, AC-9, AC-10, against the
// fixture API. Every assertion here is about what a crawler, a phone, or an
// in-app browser actually receives.

const BASE = 'https://curbsocial.club';

async function jsonLd(page: import('@playwright/test').Page) {
  const raw = await page.locator('script[type="application/ld+json"]').first().textContent();
  return JSON.parse(raw ?? '{}') as Record<string, unknown>;
}

test.describe('W03 event page', () => {
  test('AC-1: meta, canonical, the smart banner, and JSON-LD with a schedule', async ({ page }) => {
    const response = await page.goto('/meets/lido-saturday');
    expect(response?.status()).toBe(200);

    await expect(page).toHaveTitle('Lido Saturday | curb');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `${BASE}/meets/lido-saturday`,
    );
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      `${BASE}/og/meets/lido-saturday.png`,
    );
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      'content',
      'summary_large_image',
    );
    await expect(page.locator('meta[name="apple-itunes-app"]')).toHaveAttribute(
      'content',
      `app-id=6740000000, app-argument=${BASE}/meets/lido-saturday`,
    );

    const json = await jsonLd(page);
    expect(json['@type']).toBe('Event');
    expect((json.organizer as Record<string, unknown>)['@type']).toBe('Organization');
    expect(json.sponsor).toHaveLength(1);
    expect((json.eventSchedule as Record<string, unknown>).byDay).toEqual([
      'https://schema.org/Saturday',
    ]);
  });

  test('AC-2: a one-off cancelled meet has no schedule and says it is cancelled', async ({
    page,
  }) => {
    await page.goto('/meets/fontana-sunday');

    const json = await jsonLd(page);
    expect(json.eventSchedule).toBeUndefined();
    expect(json.eventStatus).toBe('https://schema.org/EventCancelled');
    await expect(page.getByRole('alert')).toContainText('Cancelled this week. Host note: rain.');
  });

  test('AC-3: an unlisted meet is a 404 without its token and a 200 with it', async ({ page }) => {
    const without = await page.goto('/meets/secret-meet');
    expect(without?.status()).toBe(404);

    const withToken = await page.goto('/meets/secret-meet?token=tok_9');
    expect(withToken?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Secret Meet');
    // Reachable only by its link, so never an address a crawler keeps.
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  });

  test('R-21: a meet the API has retired answers 410, not 200', async ({ page }) => {
    const response = await page.goto('/meets/gone-meet');
    expect(response?.status()).toBe(410);
  });

  test('the blocks render in the S08 order', async ({ page }) => {
    await page.goto('/meets/lido-saturday');

    const headings = await page.locator('main h2').allTextContents();
    expect(headings).toEqual(['When', 'Where', 'Host', 'Sponsors', 'Going', 'About', 'Source', 'Photos']);
  });
});

test.describe('W04 occurrence page', () => {
  test('AC-4: a materialized date points at the event, an edited one at itself', async ({
    page,
  }) => {
    await page.goto('/meets/lido-saturday/44444444-4444-4444-8444-444444444444');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `${BASE}/meets/lido-saturday`,
    );

    await page.goto('/meets/lido-saturday/overridden');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `${BASE}/meets/lido-saturday/overridden`,
    );
  });
});

test.describe('W02 meets list', () => {
  test('AC-10: a city page is self-canonical and a search is noindex', async ({ page }) => {
    await page.goto('/meets?city=laguna-beach');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `${BASE}/meets?city=laguna-beach`,
    );
    await expect(page.locator('meta[name="robots"]')).toHaveCount(0);

    await page.goto('/meets?q=porsche');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
  });

  test('a search with no results says so in the spec words', async ({ page }) => {
    await page.goto('/meets?q=porsche');

    await expect(page.getByText('Nothing for "porsche". Try a city, a host, or a day.')).toBeVisible();
  });
});

const FIXTURE_API = `http://localhost:${process.env.FIXTURE_API_PORT ?? 4100}`;

test.describe('W01 home', () => {
  test('renders the headline and the three time sections', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'This weekend, within 20 miles.',
    );
    await expect(page.getByRole('heading', { name: 'This weekend', exact: true })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Next week', exact: true })).toBeVisible();
  });

  test('AC-9: the Vercel IP headers reach the API rounded to two decimals', async ({
    page,
    request,
  }) => {
    await request.get(`${FIXTURE_API}/__requests/reset`);
    // The loader runs in Node, so `near` never appears in the browser. The
    // fixture API is the only place it can be observed.
    await page.setExtraHTTPHeaders({
      'x-vercel-ip-latitude': '33.6189',
      'x-vercel-ip-longitude': '-117.9289',
    });
    await page.goto('/');

    const seen = await (await request.get(`${FIXTURE_API}/__requests`)).json();
    const feed = (seen.data as { path: string; query: Record<string, string> }[]).find(
      (row) => row.path === '/v1/feed',
    );
    expect(feed?.query.near).toBe('33.62,-117.93');
  });

  test('R-2: a near a reader typed into the URL is re-rounded, not trusted', async ({
    page,
    request,
  }) => {
    await request.get(`${FIXTURE_API}/__requests/reset`);
    await page.goto('/?near=33.618912,-117.928934');

    const seen = await (await request.get(`${FIXTURE_API}/__requests`)).json();
    const feed = (seen.data as { path: string; query: Record<string, string> }[]).find(
      (row) => row.path === '/v1/feed',
    );
    expect(feed?.query.near).toBe('33.62,-117.93');
  });
});

test.describe('W14 OG card', () => {
  test('AC-12: a 1200x630 PNG cached for an hour at the edge', async ({ request }) => {
    const response = await request.get('/og/meets/lido-saturday.png');

    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toBe('image/png');
    expect(response.headers()['cache-control']).toBe(
      'public, s-maxage=3600, stale-while-revalidate=86400',
    );

    const body = await response.body();
    expect(body.readUInt32BE(16)).toBe(1200);
    expect(body.readUInt32BE(20)).toBe(630);
  });
});

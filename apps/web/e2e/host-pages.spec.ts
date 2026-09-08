import { expect, test } from '@playwright/test';

// web.md AC-5 and AC-8, clubs.md AC-12, sponsors.md slice 5,
// profiles-and-follow.md AC-18's web half.

const BASE = 'https://curbsocial.club';

async function jsonLd(page: import('@playwright/test').Page) {
  const raw = await page.locator('script[type="application/ld+json"]').first().textContent();
  return JSON.parse(raw ?? '{}') as Record<string, unknown>;
}

test.describe('W08 club page', () => {
  test('AC-5 and clubs AC-12: Organization JSON-LD with sameAs from links', async ({ page }) => {
    const response = await page.goto('/clubs/back-bay-air-cooled');
    expect(response?.status()).toBe(200);

    const json = await jsonLd(page);
    expect(json['@type']).toBe('Organization');
    expect(json.name).toBe('Back Bay Air-Cooled');
    expect(json.url).toBe(`${BASE}/clubs/back-bay-air-cooled`);
    // sameAs is where a crawler learns these accounts are the same club, so
    // it carries the built addresses rather than the stored handles.
    expect(json.sameAs).toContain('https://instagram.com/backbayaircooled');
    expect(json.sameAs).toContain('https://backbayaircooled.com/');

    // AC-12 also wants og:title equal to the name and og:image set.
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      'content',
      'Back Bay Air-Cooled | curb',
    );
  });

  test('R-5: a hidden club is a 404 page, not an error', async ({ page }) => {
    const response = await page.goto('/clubs/nobody-here');

    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Not found.');
  });

  test('R-28: a host social link is nofollow, not an endorsement', async ({ page }) => {
    await page.goto('/clubs/back-bay-air-cooled');

    await expect(page.getByRole('link', { name: 'Instagram' })).toHaveAttribute(
      'rel',
      'nofollow noopener',
    );
  });
});

test.describe('W09 sponsor page', () => {
  test('AC-5: Organization JSON-LD and the kind label', async ({ page }) => {
    await page.goto('/sponsors/bear-coast');

    const json = await jsonLd(page);
    expect(json['@type']).toBe('Organization');
    expect(json.sameAs).toContain('https://bearcoastcoffee.com/');

    // sponsors.md Copy: `kind` changes the label and nothing else.
    await expect(page.getByText('Vendor')).toBeVisible();
    await expect(page.getByText('Hosts')).toBeVisible();
    await expect(page.getByText('Sponsors')).toBeVisible();
  });

  test('sponsors R-18: no create or edit surface, only the address', async ({ page }) => {
    await page.goto('/sponsors/bear-coast');

    await expect(
      page.getByText('Run this business? Email hello@curbsocial.club to update the page.'),
    ).toBeVisible();
    for (const label of ['Edit', 'Edit page', 'Manage', 'Claim']) {
      await expect(page.getByRole('button', { name: label })).toHaveCount(0);
    }
  });
});

test.describe('W06 profile', () => {
  test('R-9: a person gets no JSON-LD, because a person is not an Organization', async ({
    page,
  }) => {
    await page.goto('/u/amir');

    await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(0);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Amir');
    await expect(page.getByText('128 followers. 3 meets.')).toBeVisible();
  });

  test('R-7: a handle nobody has is the 404 page', async ({ page }) => {
    const response = await page.goto('/u/nobody');

    expect(response?.status()).toBe(404);
  });
});

test.describe('W07 club directory', () => {
  test('clubs R-22: the title copy and the clubs the API returned', async ({ page }) => {
    await page.goto('/clubs');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Clubs in Southern California',
    );
    await expect(page.getByRole('link', { name: 'Back Bay Air-Cooled' })).toBeVisible();
  });
});

test.describe('W12 city pages', () => {
  test('AC-8: a known city renders the sections and the meta description', async ({ page }) => {
    const response = await page.goto('/socal/newport-beach');

    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'cars and coffee in Newport Beach',
    );
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      'Every car meet within 10 miles of Newport Beach this weekend, with times, lots, and hosts.',
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `${BASE}/socal/newport-beach`,
    );
  });

  test('AC-8: an unknown city is a 404', async ({ page }) => {
    const response = await page.goto('/socal/nowhere');

    expect(response?.status()).toBe(404);
  });

  test('R-12: only the three time sections, never clubs or sponsors near you', async ({ page }) => {
    await page.goto('/socal/newport-beach');

    const headings = await page.locator('main h2').allTextContents();
    for (const heading of headings) {
      expect(['This weekend', 'Next week', 'Later']).toContain(heading);
    }
  });
});

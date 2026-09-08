import { describe, expect, it } from 'vitest';

import { APPLINK_COMPONENTS, APP_BUNDLE_ID, buildAasa } from '~/routes/[.well-known].apple-app-site-association';
import { DISALLOWED, buildRobots } from '~/routes/robots[.txt]';
import { buildSitemap } from '~/routes/sitemap[.xml]';

const BASE = 'https://curbsocial.club';

// web.md AC-14 and AC-15. The XML and the JSON are what a crawler and an
// iPhone parse, so these assert the documents rather than the code paths.

describe('the sitemap', () => {
  it('AC-14: validates as a urlset, with lastmod where the API gave one', () => {
    const xml = buildSitemap(BASE, [
      { path: '/' },
      { path: '/meets/lido-saturday', lastmod: '2026-09-01T00:00:00Z' },
    ]);

    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    // The namespace is sitemaps.org, plural. Singular parses as XML and is
    // rejected as a sitemap.
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(xml).toContain(`<loc>${BASE}/</loc>`);
    expect(xml).toContain(`<loc>${BASE}/meets/lido-saturday</loc>`);
    expect(xml).toContain('<lastmod>2026-09-01T00:00:00Z</lastmod>');
  });

  it('escapes the characters that would break the document', () => {
    const xml = buildSitemap(BASE, [{ path: '/meets/a&b' }]);

    expect(xml).toContain('a&amp;b');
    expect(xml).not.toContain('a&b');
  });

  it('has one url element per entry and no more', () => {
    const xml = buildSitemap(BASE, [{ path: '/' }, { path: '/meets' }, { path: '/clubs' }]);

    expect(xml.split('<url>')).toHaveLength(4);
  });
});

describe('robots.txt', () => {
  it('AC-14: allows everything, disallows the machinery, and names the sitemap', () => {
    const robots = buildRobots(BASE);

    expect(robots).toContain('User-agent: *');
    expect(robots).toContain('Allow: /');
    // R-17's list, plus the calendar downloads 1.16 added.
    for (const path of ['/map', '/posts/', '/og/', '/new', '/imports/', '/sign-in']) {
      expect(robots).toContain(`Disallow: ${path}`);
      expect(DISALLOWED).toContain(path);
    }
    expect(robots).toContain(`Sitemap: ${BASE}/sitemap.xml`);
  });

  it('names no sitemap when the deployment has no origin', () => {
    // A Sitemap line pointing nowhere is worse than none.
    expect(buildRobots(null)).not.toContain('Sitemap:');
  });
});

describe('the apple-app-site-association', () => {
  it('AC-15: carries the appID and the components list', () => {
    const aasa = buildAasa('ABCDE12345');

    expect(aasa.applinks.details[0]?.appID).toBe(`ABCDE12345.${APP_BUNDLE_ID}`);
    expect(aasa.webcredentials.apps).toEqual([`ABCDE12345.${APP_BUNDLE_ID}`]);
  });

  it('R-18: every screen path is allowed and every machinery path excluded', () => {
    const allowed: string[] = APPLINK_COMPONENTS.filter((row) => !('exclude' in row)).map(
      (row) => row['/'],
    );
    const excluded: string[] = APPLINK_COMPONENTS.filter((row) => 'exclude' in row).map(
      (row) => row['/'],
    );

    for (const path of ['/meets/*', '/occurrences/*', '/u/*', '/clubs/*', '/sponsors/*']) {
      expect(allowed).toContain(path);
    }
    for (const path of ['/og/*', '/sign-in', '/new']) {
      expect(excluded).toContain(path);
    }
    // An excluded pattern that is also allowed would let the app claim a
    // link the web app is supposed to keep.
    expect(allowed.filter((path) => excluded.includes(path))).toEqual([]);
  });

  it('is JSON with no extension, which is what Apple fetches', () => {
    expect(() => JSON.parse(JSON.stringify(buildAasa('ABCDE12345')))).not.toThrow();
  });
});

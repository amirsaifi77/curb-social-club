import { api } from '@curb/api-client';

import type { Route } from './+types/sitemap[.xml]';

import { serverClient } from '~/lib/api.server';
import { CITIES } from '~/lib/cities';
import { deviceIdForRequest } from '~/lib/cookies.server';
import { shareBaseUrl } from '~/lib/env.server';

// W15 (web.md R-17). Every indexable page, built from GET /sitemap so the
// list does not page through the events endpoint (R-4).

export const SITEMAP_CACHE_CONTROL = 'public, s-maxage=3600, stale-while-revalidate=86400';

interface Entry {
  path: string;
  lastmod?: string;
}

// XML has five characters that cannot appear raw in a text node. A slug is
// generated and safe today, but an escape here costs nothing and a broken
// sitemap fails silently in a search console nobody is watching.
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// sitemaps.org caps one file at 50,000 URLs and 50 MB uncompressed, and
// rejects the whole file past either. An index of several files is the
// answer when the schedule outgrows this; until then, truncating keeps a
// valid sitemap instead of none.
export const SITEMAP_MAX_URLS = 50_000;

export function buildSitemap(baseUrl: string, entries: readonly Entry[]): string {
  const urls = entries
    .slice(0, SITEMAP_MAX_URLS)
    .map((entry) => {
      const loc = `<loc>${escapeXml(`${baseUrl}${entry.path}`)}</loc>`;
      const lastmod = entry.lastmod ? `<lastmod>${escapeXml(entry.lastmod)}</lastmod>` : '';
      return `<url>${loc}${lastmod}</url>`;
    })
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
}

export async function loader({ request }: Route.LoaderArgs) {
  const baseUrl = shareBaseUrl();
  // Without an origin every loc would be a relative path, which is not a
  // sitemap. Better to serve nothing than a file a crawler will reject.
  if (!baseUrl) throw new Response('Not Found', { status: 404 });

  const client = serverClient(deviceIdForRequest(request.headers.get('cookie')));
  const sitemap = await api.sitemap.get(client);

  const entries: Entry[] = [
    { path: '/' },
    { path: '/meets' },
    { path: '/clubs' },
    ...CITIES.map((city) => ({ path: `/socal/${city.slug}` })),
    // R-17 and AC-3: an unlisted event is absent, which the API decides by
    // only returning public rows.
    ...sitemap.events.map((row) => ({ path: `/meets/${row.slug}`, lastmod: row.updated_at })),
    ...sitemap.clubs.map((row) => ({ path: `/clubs/${row.slug}`, lastmod: row.updated_at })),
    ...sitemap.sponsors.map((row) => ({ path: `/sponsors/${row.slug}`, lastmod: row.updated_at })),
  ];

  return new Response(buildSitemap(baseUrl, entries), {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': SITEMAP_CACHE_CONTROL,
    },
  });
}

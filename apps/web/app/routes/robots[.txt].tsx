import { shareBaseUrl } from '~/lib/env.server';

// W15 (web.md R-17): allow everything a reader can see, and keep crawlers
// out of the routes that are machinery rather than pages.
export const DISALLOWED = [
  '/map',
  '/posts/',
  '/og/',
  '/calendar/',
  '/new',
  '/imports/',
  '/sign-in',
] as const;

export function buildRobots(baseUrl: string | null): string {
  const lines = ['User-agent: *', 'Allow: /', ...DISALLOWED.map((path) => `Disallow: ${path}`)];
  // Naming a sitemap that is not there is worse than naming none.
  if (baseUrl) lines.push('', `Sitemap: ${baseUrl}/sitemap.xml`);
  return `${lines.join('\n')}\n`;
}

export function loader() {
  return new Response(buildRobots(shareBaseUrl()), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600',
    },
  });
}

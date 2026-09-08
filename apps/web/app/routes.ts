import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('meets', 'routes/meets._index.tsx'),
  route('meets/:slug', 'routes/meets.$slug.tsx'),
  route('meets/:slug/:occurrenceId', 'routes/meets.$slug.$occurrenceId.tsx'),
  // The .ics has its own namespace rather than a segment under the slug,
  // where it would sit beside W04's :occurrenceId and rely on static
  // segments winning. /og/ is laid out the same way.
  route('calendar/meets/:slug.ics', 'routes/calendar.meets.$slug[.ics].tsx'),
  // W14: the link preview card, in its own namespace so it is easy to
  // disallow in robots.txt (R-17).
  route('og/meets/:slug.png', 'routes/og.meets.$slug[.png].tsx'),
  // The flat brand card, for a host page with no banner (clubs.md R-21).
  route('og/placeholder.png', 'routes/og.placeholder[.png].tsx'),
  // W06 to W09: the host pages, and the directory W07.
  route('u/:handle', 'routes/u.$handle.tsx'),
  route('clubs', 'routes/clubs._index.tsx'),
  route('clubs/:slug', 'routes/clubs.$slug.tsx'),
  route('sponsors/:slug', 'routes/sponsors.$slug.tsx'),
  // W12: the seven city pages.
  route('socal/:city', 'routes/socal.$city.tsx'),
  // W05: client only, so there is nothing to server-render.
  route('map', 'routes/map.tsx'),
  // W15: the three files a crawler and an iPhone read rather than a reader.
  route('sitemap.xml', 'routes/sitemap[.xml].tsx'),
  route('robots.txt', 'routes/robots[.txt].tsx'),
  route(
    '.well-known/apple-app-site-association',
    'routes/[.well-known].apple-app-site-association.tsx',
  ),
  route('sentry-test', 'routes/sentry-test.tsx'),
  // Last: whatever matched nothing above is R-21's 404, which is a page
  // with nearby meets rather than a boundary with a stack trace.
  route('*', 'routes/$.tsx'),
] satisfies RouteConfig;

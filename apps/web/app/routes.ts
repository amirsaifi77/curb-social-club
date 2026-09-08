import { type RouteConfig, index, route } from '@react-router/dev/routes';

export default [
  index('routes/home.tsx'),
  route('meets/:slug', 'routes/meets.$slug.tsx'),
  route('meets/:slug/:occurrenceId', 'routes/meets.$slug.$occurrenceId.tsx'),
  // The .ics has its own namespace rather than a segment under the slug,
  // where it would sit beside W04's :occurrenceId and rely on static
  // segments winning. /og/ is laid out the same way.
  route('calendar/meets/:slug.ics', 'routes/calendar.meets.$slug[.ics].tsx'),
  route('sentry-test', 'routes/sentry-test.tsx'),
] satisfies RouteConfig;

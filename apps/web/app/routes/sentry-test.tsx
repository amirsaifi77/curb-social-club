import type { Route } from './+types/sentry-test';

// Documented way to send a server test event (docs/local-development.md):
// set SENTRY_TEST_ENABLED=1 on the deployment, open /sentry-test, unset it.
// Otherwise the route is a plain 404.
export function loader(_args: Route.LoaderArgs) {
  if (process.env.SENTRY_TEST_ENABLED !== '1') {
    throw new Response('Not found', { status: 404 });
  }
  throw new Error('Sentry test event from web');
}

export default function SentryTest() {
  return null;
}

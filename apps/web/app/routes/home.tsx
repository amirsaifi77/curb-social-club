import type { Route } from './+types/home';

import { apiBaseUrl, fetchApiHealth } from '~/lib/api.server';

// Placeholder home (session 0.8). W01 replaces it in Phase 1 with nearby
// upcoming meets; until then the loader proves the site reaches the API.
export function meta(_args: Route.MetaArgs) {
  return [
    { title: 'Curb Social Club' },
    {
      name: 'description',
      content:
        'Local car meets in coastal Orange County. Saturday mornings, named places, times that hold.',
    },
  ];
}

export async function loader(_args: Route.LoaderArgs) {
  const baseUrl = apiBaseUrl();
  const health = await fetchApiHealth(baseUrl);
  return { apiHost: new URL(baseUrl).host, health };
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { apiHost, health } = loaderData;
  return (
    <main className="mx-auto flex min-h-screen max-w-readingMax flex-col justify-center gap-6 px-gutter py-16">
      <h1 className="font-display text-6xl leading-none tracking-tight">curb</h1>
      <p className="text-xl">
        Local car meets in coastal Orange County. Saturday mornings, named places, times that hold.
      </p>
      <p className="text-textSecondary">
        Curb Social Club opens on iOS first. This page will list the weekend&apos;s meets.
      </p>
      <p className="mt-8 text-sm text-textSecondary" data-testid="api-status">
        API {apiHost}: {health.ok ? 'reachable' : 'unreachable'}
      </p>
    </main>
  );
}

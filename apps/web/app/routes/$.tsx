import { data } from 'react-router';

import type { Route } from './+types/$';

import { NotFound } from '~/components/NotFound';
import { nearbyMeets, serverClient } from '~/lib/api.server';
import { deviceIdForRequest } from '~/lib/cookies.server';
import { WEB_COPY } from '~/lib/copy';
import { pageMeta } from '~/lib/seo';

// R-21: an address nobody has is a page with three meets near the reader on
// it. An error boundary cannot fetch, so the 404 is a route of its own that
// matches whatever is left over and answers with the right status.
export async function loader({ request }: Route.LoaderArgs) {
  const client = serverClient(deviceIdForRequest(request.headers.get('cookie')));
  // A page, with the status a crawler needs to see.
  return data(
    { nearby: await nearbyMeets(client, request) },
    {
      status: 404,
      // A crawl of stale links is otherwise one feed request per dead URL,
      // from a single egress IP, which is the worst shape for rack-attack.
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600' },
    },
  );
}

export function meta() {
  return pageMeta({
    title: WEB_COPY.notFoundHeadline,
    description: WEB_COPY.notFoundBody,
    canonical: null,
    noindex: true,
  });
}

export default function NotFoundRoute({ loaderData }: Route.ComponentProps) {
  return <NotFound status={404} nearby={loaderData.nearby} />;
}

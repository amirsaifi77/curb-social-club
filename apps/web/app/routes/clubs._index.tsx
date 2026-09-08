import { api } from '@curb/api-client';
import { Link } from 'react-router';

import type { Route } from './+types/clubs._index';

import { serverClient, vercelNear } from '~/lib/api.server';
import { deviceIdForRequest } from '~/lib/cookies.server';
import { HOST_COPY, followersLine } from '~/lib/copy';
import { appStoreId, shareBaseUrl } from '~/lib/env.server';
import { canonicalUrl, ogPlaceholderUrl, pageMeta } from '~/lib/seo';

// W07 (clubs.md R-22). Nearest first when a region is known, which it is
// from the Vercel headers; the API orders by followers without a `near`.
export async function loader({ request }: Route.LoaderArgs) {
  const client = serverClient(deviceIdForRequest(request.headers.get('cookie')));
  // R-22: every active club, nearest first when a region is known. Only a
  // real Vercel header is a known region: the coastal Orange County
  // fallback would make `near` always present, and the API's 32 km
  // ST_DWithin would then hide every club outside that ring and every club
  // with no home location at all.
  const near = vercelNear(request);
  const clubs = await api.clubs.list(client, near ? { near } : {});
  return { clubs: clubs.data, baseUrl: shareBaseUrl(), appStoreId: appStoreId() };
}

export function meta({ data: loaderData }: Route.MetaArgs) {
  return pageMeta({
    title: HOST_COPY.clubsTitle,
    description: 'Car clubs and crews that run local meets, with the meets they organize.',
    canonical: canonicalUrl(loaderData?.baseUrl ?? null, '/clubs'),
    image: ogPlaceholderUrl(loaderData?.baseUrl ?? null, HOST_COPY.clubsTitle),
    appStoreId: loaderData?.appStoreId ?? null,
  });
}

export default function ClubsIndex({ loaderData }: Route.ComponentProps) {
  const { clubs } = loaderData;

  return (
    <main className="mx-auto max-w-pageMax px-gutter py-10">
      <h1 className="font-display text-4xl">{HOST_COPY.clubsTitle}</h1>

      {clubs.length === 0 ? (
        <p className="mt-8 text-lg">{HOST_COPY.clubsEmpty}</p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clubs.map((club) => (
            <li key={club.id} className="border border-border bg-surface p-4">
              <Link to={`/clubs/${club.slug}`} className="font-display text-2xl">
                {club.name}
              </Link>
              {club.home_label ? (
                <p className="text-textSecondary">{club.home_label}</p>
              ) : null}
              <p className="text-sm text-textSecondary">{followersLine(club.followers_count)}</p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

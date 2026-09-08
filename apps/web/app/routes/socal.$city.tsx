import { api } from '@curb/api-client';
import { data } from 'react-router';

import type { Route } from './+types/socal.$city';

import { MeetCard, isEventSummary } from '~/components/MeetCard';
import { nearbyMeets, serverClient } from '~/lib/api.server';
import { CITIES, cityNear, findCity } from '~/lib/cities';
import { deviceIdForRequest } from '~/lib/cookies.server';
import { cityDescription, cityEmpty, cityTitle } from '~/lib/copy';
import { shareBaseUrl } from '~/lib/env.server';
import { canonicalUrl, pageMeta } from '~/lib/seo';

// W12 (web.md R-12). One page per launch city, the three time sections
// only, within 10 miles. A known city with no meets stays live with its
// empty copy so the URL keeps its rank; only an unknown slug is a 404.
const TIME_SECTIONS = ['this_weekend', 'next_week', 'later'] as const;
export const CITY_RADIUS_KM = 16;

export async function loader({ request, params }: Route.LoaderArgs) {
  const client = serverClient(deviceIdForRequest(request.headers.get('cookie')));
  const city = findCity(params.city);
  if (!city) {
    throw data({ nearby: await nearbyMeets(client, request) }, { status: 404 });
  }

  const feed = await api.feed.get(client, {
    near: cityNear(city),
    radius_km: CITY_RADIUS_KM,
  });
  const sections = feed.data.sections.filter((section) =>
    (TIME_SECTIONS as readonly string[]).includes(section.kind),
  );

  return { city, sections, baseUrl: shareBaseUrl() };
}

export function meta({ data: loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: 'Not found | curb' }];
  const { city, baseUrl } = loaderData;
  return pageMeta({
    title: cityTitle(city.name),
    description: cityDescription(city.name),
    canonical: canonicalUrl(baseUrl, `/socal/${city.slug}`),
  });
}

export default function CityPage({ loaderData }: Route.ComponentProps) {
  const { city, sections } = loaderData;
  const empty = sections.every((section) => section.items.length === 0);

  return (
    <main className="mx-auto max-w-pageMax px-gutter py-10">
      <h1 className="font-display text-4xl">{cityTitle(city.name)}</h1>

      {empty ? (
        <p className="mt-8 text-lg">{cityEmpty(city.name)}</p>
      ) : (
        sections.map((section) => (
          <section key={section.kind} className="mt-10">
            <h2 className="font-display text-3xl">{section.title}</h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {section.items.filter(isEventSummary).map((event) => (
                <li key={event.id}>
                  <MeetCard event={event} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <nav aria-label="Other cities" className="mt-12 flex flex-wrap gap-3 text-sm">
        {CITIES.filter((other) => other.slug !== city.slug).map((other) => (
          <a key={other.slug} href={`/socal/${other.slug}`} className="text-textSecondary underline">
            {other.name}
          </a>
        ))}
      </nav>
    </main>
  );
}

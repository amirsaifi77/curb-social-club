import { api, type EventsListQuery } from '@curb/api-client';
import { Form, Link } from 'react-router';

import type { Route } from './+types/meets._index';

import { MeetCard } from '~/components/MeetCard';
import { nearFromRequest, parseNear, serverClient } from '~/lib/api.server';
import { CITIES, cityNear, findCity } from '~/lib/cities';
import { readDeviceId } from '~/lib/cookies.server';
import { WEB_COPY, noResults } from '~/lib/copy';
import { appStoreUrl } from '~/lib/deep-link';
import { appStoreId, shareBaseUrl } from '~/lib/env.server';
import { canonicalUrl, pageMeta } from '~/lib/seo';

// W02 (web.md R-14). The list and the search, server-rendered. A page with
// a query is noindex: it is a view of the same meets, generated on demand,
// and indexing it would put thousands of near-duplicates in front of the
// pages that should rank.

type Tag = NonNullable<EventsListQuery['tags[]']>[number];

const TAGS: readonly Tag[] = ['jdm', 'euro', 'exotic', 'classic', 'muscle', 'truck', 'ev', 'bike'];

function isTag(value: string): value is Tag {
  return (TAGS as readonly string[]).includes(value);
}

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const q = url.searchParams.get('q')?.trim() || null;
  const city = findCity(url.searchParams.get('city'));
  const from = url.searchParams.get('from');
  const tags = url.searchParams.getAll('tags').filter(isTag);
  const near = city ? cityNear(city) : (parseNear(url.searchParams.get('near')) ?? nearFromRequest(request));
  const { deviceId } = readDeviceId(request.headers.get('cookie'));

  const response = await api.events.list(serverClient(deviceId), {
    near,
    ...(q ? { q } : {}),
    ...(from ? { from } : {}),
    ...(tags.length > 0 ? { 'tags[]': tags } : {}),
  });

  return {
    events: response.data,
    q,
    city,
    tags,
    baseUrl: shareBaseUrl(),
    appStoreId: appStoreId(),
  };
}

export function meta({ data: loaderData }: Route.MetaArgs) {
  const baseUrl = loaderData?.baseUrl ?? null;
  const city = loaderData?.city ?? null;
  const q = loaderData?.q ?? null;

  // R-14: canonical is /meets?city=<slug> when city is the only filter, and
  // /meets otherwise, so a tag or a date does not mint a new address.
  const canonical = canonicalUrl(baseUrl, city && !q ? `/meets?city=${city.slug}` : '/meets');

  return pageMeta({
    title: city ? `Meets in ${city.name}` : 'Meets',
    description: city
      ? `Car meets near ${city.name}, with times, lots, and who runs them.`
      : 'Car meets in Southern California, with times, lots, and who runs them.',
    canonical,
    appStoreId: loaderData?.appStoreId ?? null,
    noindex: Boolean(q),
  });
}

export default function MeetsIndex({ loaderData }: Route.ComponentProps) {
  const { events, q, city, tags, appStoreId: storeId } = loaderData;
  const storeUrl = appStoreUrl(storeId);

  return (
    <main className="mx-auto max-w-pageMax px-gutter py-10">
      <h1 className="font-display text-4xl">{city ? `Meets in ${city.name}` : 'Meets'}</h1>

      {/* A GET form, so a search is a URL somebody can send, and it works
          before hydration. */}
      <Form method="get" role="search" className="mt-6 flex flex-wrap gap-3">
        <label className="sr-only" htmlFor="q">
          {WEB_COPY.searchPlaceholder}
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={q ?? ''}
          placeholder={WEB_COPY.searchPlaceholder}
          className="min-w-64 flex-1 border border-border bg-surface px-3 py-2"
        />
        {city ? <input type="hidden" name="city" value={city.slug} /> : null}
        {tags.map((tag) => (
          <input key={tag} type="hidden" name="tags" value={tag} />
        ))}
        <button type="submit" className="border border-border px-4 py-2">
          Search
        </button>
      </Form>

      <nav aria-label="Cities" className="mt-4 flex flex-wrap gap-3 text-sm">
        {CITIES.map((option) => (
          <Link
            key={option.slug}
            to={`/meets?city=${option.slug}`}
            className={
              option.slug === city?.slug ? 'underline decoration-2' : 'text-textSecondary underline'
            }
          >
            {option.name}
          </Link>
        ))}
      </nav>

      {events.length === 0 ? (
        <p className="mt-10 text-lg">
          {q ? noResults(q) : WEB_COPY.homeEmpty}
        </p>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <li key={event.id}>
              <MeetCard event={event} />
            </li>
          ))}
        </ul>
      )}

      {/* R-10: adding a meet is an app surface. A link to the store, never
          a form that posts. */}
      {storeUrl ? (
        <p className="mt-12">
          <a href={storeUrl} className="underline">
            Add a meet
          </a>
        </p>
      ) : null}
    </main>
  );
}

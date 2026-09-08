import { api } from '@curb/api-client';
import { Link } from 'react-router';

import type { Route } from './+types/home';

import { MeetCard, isEventSummary } from '~/components/MeetCard';
import { nearFromRequest, parseNear, serverClient } from '~/lib/api.server';
import { CITIES, cityNear, findCity } from '~/lib/cities';
import { deviceIdForRequest } from '~/lib/cookies.server';
import { WEB_COPY } from '~/lib/copy';
import { appStoreUrl } from '~/lib/deep-link';
import { appStoreId, shareBaseUrl } from '~/lib/env.server';
import { canonicalUrl, pageMeta } from '~/lib/seo';

// W01 (web.md R-13). Server-rendered from GET /feed near the reader's own
// coarse location, with the city picker over the same list the city pages
// use. The three time sections only: clubs and sponsors near you are
// mobile surfaces this phase.
const TIME_SECTIONS = ['this_weekend', 'next_week', 'later'] as const;

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const city = findCity(url.searchParams.get('city'));
  // R-2 and R-13: the city's own centre when one is picked, otherwise the
  // Vercel IP headers rounded to two decimals, otherwise coastal OC.
  const near = city ? cityNear(city) : (parseNear(url.searchParams.get('near')) ?? nearFromRequest(request));
  const deviceId = deviceIdForRequest(request.headers.get('cookie'));

  const feed = await api.feed.get(serverClient(deviceId), { near });
  const sections = feed.data.sections.filter((section) =>
    (TIME_SECTIONS as readonly string[]).includes(section.kind),
  );

  return {
    sections,
    city,
    baseUrl: shareBaseUrl(),
    appStoreId: appStoreId(),
  };
}

export function meta({ data: loaderData }: Route.MetaArgs) {
  const baseUrl = loaderData?.baseUrl ?? null;
  return pageMeta({
    title: WEB_COPY.siteTitleSuffix,
    description:
      'Local car meets in coastal Orange County and the Inland Empire. Times, lots, and who runs them.',
    canonical: canonicalUrl(baseUrl, '/'),
    appStoreId: loaderData?.appStoreId ?? null,
  });
}

export default function Home({ loaderData }: Route.ComponentProps) {
  const { sections, city, appStoreId: storeId } = loaderData;
  const storeUrl = appStoreUrl(storeId);
  const empty = sections.every((section) => section.items.length === 0);

  return (
    <main className="mx-auto max-w-pageMax px-gutter py-10">
      <h1 className="font-display text-5xl leading-tight">{WEB_COPY.homeHeadline}</h1>

      <nav aria-label={WEB_COPY.homeCityPicker} className="mt-6">
        <h2 className="text-sm text-textSecondary">{WEB_COPY.homeCityPicker}</h2>
        <ul className="mt-2 flex flex-wrap gap-3">
          {CITIES.map((option) => (
            <li key={option.slug}>
              <Link
                to={`/?city=${option.slug}`}
                className={
                  option.slug === city?.slug
                    ? 'underline decoration-2'
                    : 'text-textSecondary underline'
                }
              >
                {option.name}
              </Link>
            </li>
          ))}
          <li>
            {/* R-13's "Near me": the browser's own geolocation, rounded in
                the client before it is ever sent (R-2). Without JavaScript
                the IP headers already put the reader somewhere sensible. */}
            <NearMeLink />
          </li>
        </ul>
      </nav>

      {empty ? (
        <p className="mt-10 text-lg">{WEB_COPY.homeEmpty}</p>
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

      {storeUrl ? (
        <p className="mt-12">
          <a href={storeUrl} className="underline">
            {WEB_COPY.getTheApp}
          </a>
        </p>
      ) : null}
    </main>
  );
}

function NearMeLink() {
  const onClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => {
      // R-2: rounded before it leaves the browser, so the two decimals are
      // all that ever reaches a server log.
      const lat = position.coords.latitude.toFixed(2);
      const lng = position.coords.longitude.toFixed(2);
      window.location.href = `/?near=${lat},${lng}`;
    });
  };

  return (
    <a href="/" onClick={onClick} className="text-textSecondary underline">
      {WEB_COPY.homeNearMe}
    </a>
  );
}

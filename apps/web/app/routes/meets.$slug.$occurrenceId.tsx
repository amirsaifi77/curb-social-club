import { api, errorStatus } from '@curb/api-client';
import { data, Link } from 'react-router';

import type { Route } from './+types/meets.$slug.$occurrenceId';

import { AppLink } from '~/components/AppLink';
import { OpenInAppBar } from '~/components/OpenInAppBar';
import { serverClient } from '~/lib/api.server';
import { readDeviceId } from '~/lib/cookies.server';
import { WEB_COPY, cancelledBanner, goingCounts } from '~/lib/copy';
import { isInAppBrowser } from '~/lib/deep-link';
import { appStoreId, shareBaseUrl } from '~/lib/env.server';
import { dayAndTime, directionsUrl } from '~/lib/format';
import { canonicalUrl, eventDescription, occurrenceJsonLd, ogImageUrl, pageMeta } from '~/lib/seo';

// W04 (web.md R-8): one date of one meet. The canonical points at the event
// page unless this date was overridden, because otherwise every date of a
// weekly series is a near-duplicate of the event page competing with it.

export async function loader({ request, params }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const userAgent = request.headers.get('user-agent');
  const { deviceId } = readDeviceId(request.headers.get('cookie'));
  const client = serverClient(deviceId);

  try {
    const [occurrenceResponse, eventResponse] = await Promise.all([
      api.occurrences.get(client, params.occurrenceId),
      api.events.get(client, params.slug, token ? { token } : {}),
    ]);
    const occurrence = occurrenceResponse.data;
    // The id and the slug arrive separately, so a link that pairs one
    // meet's slug with another's date would otherwise render as if it were
    // this meet's date.
    if (occurrence.event.slug !== params.slug) {
      throw data({}, { status: 404, statusText: 'Not Found' });
    }
    return {
      occurrence,
      event: eventResponse.data,
      baseUrl: shareBaseUrl(),
      appStoreId: appStoreId(),
      inAppBrowser: isInAppBrowser(userAgent),
      directions: directionsUrl(eventResponse.data.venue, userAgent),
    };
  } catch (error) {
    const status = errorStatus(error);
    if (status === 404 || status === 410) {
      throw data({}, { status, statusText: status === 410 ? 'Gone' : 'Not Found' });
    }
    throw error;
  }
}

export function meta({ data: loaderData }: Route.MetaArgs) {
  if (!loaderData) return [{ title: `Not found | ${WEB_COPY.siteTitleSuffix}` }];
  const { event, occurrence, baseUrl, appStoreId: storeId } = loaderData;
  // R-8: self-canonical only for a date a host edited. Every other date of
  // a weekly series is a near-duplicate of the event page, and pointing
  // each one at itself would set them competing with it.
  const overridden = occurrence.overridden_at !== null;
  const canonical = canonicalUrl(
    baseUrl,
    overridden ? `/meets/${event.slug}/${occurrence.id}` : `/meets/${event.slug}`,
  );

  return pageMeta({
    title: `${event.title}, ${dayAndTime(occurrence.starts_at, occurrence.timezone)}`,
    description: eventDescription(event),
    canonical,
    image: ogImageUrl(baseUrl, event.slug),
    appStoreId: storeId,
    noindex: event.visibility === 'unlisted',
  });
}

export default function OccurrencePage({ loaderData }: Route.ComponentProps) {
  const { occurrence, event, baseUrl, appStoreId: storeId, inAppBrowser, directions } = loaderData;
  const cancelled = occurrence.status === 'cancelled';
  const jsonLd = occurrenceJsonLd(event, occurrence, baseUrl);

  return (
    <>
      <OpenInAppBar show={inAppBrowser} path={`occurrences/${occurrence.id}`} appStoreId={storeId} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="mx-auto max-w-readingMax px-gutter py-8">
        <h1 className="font-display text-4xl leading-tight">{event.title}</h1>
        <p className="mt-2 text-2xl">{dayAndTime(occurrence.starts_at, occurrence.timezone)}</p>

        {cancelled ? (
          <p role="alert" className="mt-4 border border-error px-4 py-3 text-error">
            {cancelledBanner(occurrence.override_note)}
          </p>
        ) : null}

        <p className="mt-4">{event.venue.name}</p>
        <a href={directions} className="underline" rel="noopener">
          {WEB_COPY.directions}
        </a>

        <p className="mt-4 text-textSecondary">{goingCounts(occurrence.going_count)}</p>

        <div className="mt-6 flex flex-wrap gap-4">
          <AppLink path={`occurrences/${occurrence.id}`} appStoreId={storeId} className="underline">
            {WEB_COPY.rsvp}
          </AppLink>
          <Link to={`/meets/${event.slug}`} className="underline">
            All dates
          </Link>
        </div>
        <p className="mt-1 text-sm text-textSecondary">{WEB_COPY.rsvpHelper}</p>
      </main>
    </>
  );
}

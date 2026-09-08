import { api, errorDetails, errorStatus } from '@curb/api-client';
import { data, Link } from 'react-router';

import type { Route } from './+types/meets.$slug';

import { AppLink } from '~/components/AppLink';
import { CopyLink } from '~/components/CopyLink';
import { OpenInAppBar } from '~/components/OpenInAppBar';
import { nearFromRequest, nearbyMeets, serverClient } from '~/lib/api.server';
import { deviceIdForRequest } from '~/lib/cookies.server';
import { WEB_COPY, cancelledBanner, goingCounts, lastConfirmed, sourceCard } from '~/lib/copy';
import { isInAppBrowser, isIos } from '~/lib/deep-link';
import { appStoreId, shareBaseUrl } from '~/lib/env.server';
import {
  dayAndTime,
  directionsUrl,
  hostPath,
  isStale,
  shortDate,
  sourceLabel,
} from '~/lib/format';
import { canonicalUrl, eventDescription, eventJsonLd, jsonLdScript, ogImageUrl, pageMeta } from '~/lib/seo';

// W03 (web.md R-5 to R-7, R-10, R-11). The same blocks as S08 in the same
// order (event-detail-and-rsvp.md R-11), server-rendered from the anonymous
// API. Read only: nothing here calls a write endpoint.

export async function loader({ request, params }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const userAgent = request.headers.get('user-agent');
  const deviceId = deviceIdForRequest(request.headers.get('cookie'));
  const client = serverClient(deviceId);

  try {
    const response = await api.events.get(client, params.slug, {
      ...(token ? { token } : {}),
      // R-20 of the event spec: the API fills the nearby list on a 410.
      near: nearFromRequest(request),
    });
    return {
      event: response.data,
      // The three environment-driven values the page renders with.
      baseUrl: shareBaseUrl(),
      appStoreId: appStoreId(),
      inAppBrowser: isInAppBrowser(userAgent),
      isIos: isIos(userAgent),
      directions: directionsUrl(response.data.venue, userAgent),
      token,
    };
  } catch (error) {
    const status = errorStatus(error);
    // R-7 and AC-3: an unlisted event without its token is a 404, and a
    // hidden or deleted one is a 410. Both are thrown, so the boundary
    // renders them with the right status for a crawler. The pages with
    // nearby cards land in 1.17; the statuses are what this slice owes.
    if (status === 404 || status === 410) {
      // R-21: a 410 comes with the API's own nearby rows; a 404 has none,
      // so the page falls back to the feed near the reader.
      const nearby = errorDetails(error)?.nearby;
      throw data(
        { nearby: Array.isArray(nearby) ? nearby : await nearbyMeets(client, request) },
        { status, statusText: status === 410 ? 'Gone' : 'Not Found' },
      );
    }
    throw error;
  }
}

export function meta({ data: loaderData, location }: Route.MetaArgs) {
  if (!loaderData) return [{ title: `Not found | ${WEB_COPY.siteTitleSuffix}` }];
  const { event, baseUrl, appStoreId: storeId, token } = loaderData;
  // R-14's canonical rule for a token: the unlisted page is the same page
  // with or without it, so the canonical carries no secret.
  const canonical = canonicalUrl(baseUrl, `/meets/${event.slug}`);
  void location;
  return pageMeta({
    title: event.title,
    description: eventDescription(event),
    canonical,
    image: ogImageUrl(baseUrl, event.slug, token),
    appStoreId: storeId,
    // An unlisted event is reachable only by its link, so it is never an
    // address a crawler should keep.
    noindex: event.visibility === 'unlisted',
  });
}

export default function EventPage({ loaderData }: Route.ComponentProps) {
  const { event, baseUrl, appStoreId: storeId, inAppBrowser, directions, token } = loaderData;
  const onIos = loaderData.isIos;
  const next = event.upcoming_occurrences[0] ?? null;
  const cancelled = next?.status === 'cancelled';
  const stale = event.last_confirmed_at ? isStale(event.last_confirmed_at) : false;
  const host = event.host;
  const hostHref = host ? hostPath(host) : null;
  const jsonLd = eventJsonLd({ event, baseUrl });
  // An unlisted meet is reachable only by its link, so every link this page
  // draws has to carry the token too, or the card and the calendar 404 for
  // exactly the meets whose only channel is a pasted URL.
  const query = token ? `?token=${encodeURIComponent(token)}` : '';
  const calendarHref = `/calendar/meets/${event.slug}.ics${query}`;

  return (
    <>
      <OpenInAppBar show={inAppBrowser} path={`meets/${event.slug}`} appStoreId={storeId} />
      {/* R-6: the structured data a crawler reads, not a second copy of
          the page for a reader. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(jsonLd) }}
      />

      <main className="mx-auto max-w-readingMax px-gutter pb-16">
        {/* R-11 block order: cover with the title on a scrim, then when,
            where, host, sponsors, going, about, source, photos, comments. */}
        <figure className="relative -mx-gutter mb-6">
          {event.cover_url ? (
            <img
              src={event.cover_url}
              alt=""
              className="aspect-[16/9] w-full object-cover"
              width={1200}
              height={675}
            />
          ) : (
            <div className="aspect-[16/9] w-full bg-surfaceRaised" />
          )}
          <figcaption className="absolute inset-x-0 bottom-0 bg-scrim px-gutter py-4">
            <h1 className="font-display text-4xl leading-tight text-onScrim">{event.title}</h1>
          </figcaption>
        </figure>

        {cancelled ? (
          <p role="alert" className="mb-6 border border-error px-4 py-3 text-error">
            {cancelledBanner(next?.override_note ?? null)}
          </p>
        ) : null}

        <section className="mb-8">
          <h2 className="sr-only">When</h2>
          {next ? (
            <p className="text-2xl">{dayAndTime(next.starts_at, next.timezone)}</p>
          ) : (
            <p>No dates listed yet.</p>
          )}
          {event.recurring && event.rrule_text ? (
            <p className="text-textSecondary">{event.rrule_text}</p>
          ) : null}
          {stale && event.last_confirmed_at ? (
            <p className="text-sm text-textSecondary">
              {lastConfirmed(shortDate(event.last_confirmed_at, next?.timezone))}
            </p>
          ) : null}

          {event.upcoming_occurrences.length > 1 ? (
            <ul className="mt-4 space-y-1">
              {event.upcoming_occurrences.slice(1, 5).map((occurrence) => (
                <li key={occurrence.id}>
                  <Link
                    to={`/meets/${event.slug}/${occurrence.id}${query}`}
                    className="text-link underline"
                  >
                    {dayAndTime(occurrence.starts_at, occurrence.timezone)}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-4">
            {next ? (
              <a href={calendarHref} className="underline" download>
                {WEB_COPY.calendar}
              </a>
            ) : null}
            {/* R-10: the app, then the store. Never a write endpoint. */}
            <AppLink
              path={`meets/${event.slug}`}
              appStoreId={storeId}
              isIos={onIos}
              disabled={cancelled}
              className="underline"
            >
              {WEB_COPY.rsvp}
            </AppLink>
            {/* web.md Copy, "W03 share": the canonical URL, to the clipboard. */}
            <CopyLink url={canonicalUrl(baseUrl, `/meets/${event.slug}`)} />
          </div>
          <p className="mt-1 text-sm text-textSecondary">{WEB_COPY.rsvpHelper}</p>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-2xl">Where</h2>
          <p>{event.venue.name}</p>
          <p className="text-textSecondary">
            {[event.venue.address_line1, event.venue.city, event.venue.region]
              .filter(Boolean)
              .join(', ')}
          </p>
          {event.parking_note ? (
            <p className="text-textSecondary">Parking: {event.parking_note}</p>
          ) : null}
          <a href={directions} className="mt-2 inline-block underline" rel="noopener">
            {WEB_COPY.directions}
          </a>
        </section>

        <section className="mb-8">
          <h2 className="font-display text-2xl">Host</h2>
          {host ? (
            hostHref ? (
              <Link to={hostHref} className="underline">
                {host.name}
              </Link>
            ) : (
              <p>{host.name}</p>
            )
          ) : null}
          {event.external_host_name ? (
            <p className="text-textSecondary">
              Listed from a post by {event.external_host_name}
            </p>
          ) : null}
          {event.claimed ? (
            <p className="text-textSecondary">Claimed</p>
          ) : (
            <p className="text-textSecondary">{WEB_COPY.unclaimed}</p>
          )}
        </section>

        {event.sponsorships.length > 0 ? (
          <section className="mb-8">
            <h2 className="font-display text-2xl">Sponsors</h2>
            <ul>
              {event.sponsorships.map((sponsorship) => (
                <li key={sponsorship.sponsor.id}>
                  <Link to={`/sponsors/${sponsorship.sponsor.slug}`} className="underline">
                    {sponsorship.sponsor.name}
                  </Link>
                  {sponsorship.note ? (
                    <span className="text-textSecondary"> {sponsorship.note}</span>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="mb-8">
          <h2 className="sr-only">Going</h2>
          <p className="text-textSecondary">{goingCounts(next?.going_count ?? 0)}</p>
        </section>

        {event.description ? (
          <section className="mb-8">
            <h2 className="font-display text-2xl">About</h2>
            <p className="whitespace-pre-line">{event.description}</p>
          </section>
        ) : null}

        {event.source ? (
          <section className="mb-8">
            <h2 className="sr-only">Source</h2>
            <p className="text-textSecondary">
              {sourceCard(sourceLabel(event.source.type), event.external_host_name)}
            </p>
            <a href={event.source.url} rel="noopener nofollow" className="underline">
              {WEB_COPY.sourceAction}
            </a>
          </section>
        ) : null}

        <section className="mb-8 text-textSecondary">
          <h2 className="sr-only">Photos</h2>
          <p>{WEB_COPY.photosPlaceholder}</p>
        </section>

        {/* R-11's order ends photos, then comments. Both are Phase 4, and
            both say so rather than being absent. */}
        <section className="mb-8 text-textSecondary">
          <h2 className="sr-only">Comments</h2>
          <p>{WEB_COPY.commentsPlaceholder}</p>
        </section>
      </main>
    </>
  );
}

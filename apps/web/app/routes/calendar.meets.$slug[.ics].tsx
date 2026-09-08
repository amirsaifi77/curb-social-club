import { api, errorStatus } from '@curb/api-client';

import type { Route } from './+types/calendar.meets.$slug[.ics]';

import { serverClient } from '~/lib/api.server';
import { readDeviceId } from '~/lib/cookies.server';
import { shareBaseUrl } from '~/lib/env.server';
import { buildIcs } from '~/lib/ics';

// W03's "Add to calendar" (web.md Copy). The web app cannot ask for a
// calendar permission, so it hands over a file: one VEVENT carrying the
// recurrence rule, which every calendar app on every platform understands.

export async function loader({ request, params }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const { deviceId } = readDeviceId(request.headers.get('cookie'));
  const client = serverClient(deviceId);

  let event;
  try {
    const response = await api.events.get(client, params.slug, token ? { token } : {});
    event = response.data;
  } catch (error) {
    const status = errorStatus(error);
    if (status === 404 || status === 410) throw new Response('Not Found', { status: 404 });
    throw error;
  }

  const next = event.upcoming_occurrences[0];
  // A meet with no dates has nothing to put in a calendar. An empty file
  // would download and then do nothing, which is worse than saying so.
  if (!next) throw new Response('Not Found', { status: 404 });

  const base = shareBaseUrl();
  const ics = buildIcs({
    uid: event.id,
    title: event.title,
    startsAt: next.starts_at,
    endsAt: next.ends_at,
    location: [event.venue.name, event.venue.address_line1, event.venue.city]
      .filter(Boolean)
      .join(', '),
    description: event.description,
    url: base ? `${base}/meets/${event.slug}` : null,
    rrule: event.rrule,
  });
  if (!ics) throw new Response('Not Found', { status: 404 });

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${event.slug}.ics"`,
      // The dates move when a host edits the series, so this is a short
      // cache rather than the OG route's hour.
      'Cache-Control': 'public, max-age=300',
    },
  });
}

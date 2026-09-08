import { api, errorStatus } from '@curb/api-client';

import type { Route } from './+types/og.meets.$slug[.png]';

import { serverClient } from '~/lib/api.server';
import { deviceIdForRequest } from '~/lib/cookies.server';
import { dayAndTime } from '~/lib/format';
import { OG_CACHE_CONTROL, loadCover, renderOgPng } from '~/lib/og.server';

// W14 (web.md R-16). Marine Layer light, always: a link preview has no
// reader whose scheme we could ask, and a card that changed colour between
// two people's phones would look like two different sites.
const COLORS = {
  bg: '#F3F4F4',
  text: '#23272A',
  muted: '#5C6469',
  border: '#D5D9DB',
  surface: '#FFFFFF',
};

export async function loader({ request, params }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const token = url.searchParams.get('token');
  const deviceId = deviceIdForRequest(request.headers.get('cookie'));
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

  const next = event.upcoming_occurrences[0] ?? null;
  const png = await renderOgPng({
    title: event.title,
    when: next ? dayAndTime(next.starts_at, next.timezone) : null,
    venue: [event.venue.name, event.venue.city].filter(Boolean).join(', '),
    // Fetched here rather than by Satori, so a slow CDN cannot hang the
    // route every link preview hits, and so the bytes stay under our own
    // eye (ADR 0011: Instagram media is never fetched, stored or copied).
    coverUrl: await loadCover(event.cover_url),
    colors: COLORS,
  });

  return new Response(png as BodyInit, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': OG_CACHE_CONTROL,
    },
  });
}

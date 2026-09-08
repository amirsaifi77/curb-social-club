import { createServer } from 'node:http';

import {
  CANCELLED,
  CLUB,
  CLUB_MEMBERS,
  FEED,
  PROFILE,
  SPONSOR,
  UNLISTED,
  UNLISTED_TOKEN,
  eventDetail,
  eventSummary,
  occurrence,
} from './api';

// The API the e2e suite runs against. Every loader in this app runs on the
// server, so page.route and an in-process MSW handler both sit on the wrong
// side of the boundary: the requests to intercept are made by Node, not by
// the browser. Pointing API_URL at this instead is the one place the
// interception can actually happen.

const PORT = Number(process.env.FIXTURE_API_PORT ?? 4100);

const EVENTS: Record<string, unknown> = {
  'lido-saturday': eventDetail(),
  'fontana-sunday': CANCELLED,
};

function json(body: unknown, status = 200) {
  return { status, body: JSON.stringify(body) };
}

function error(code: string, message: string, status: number, details?: unknown) {
  return json({ error: { code, message, ...(details ? { details } : {}) } }, status);
}

// What the app actually asked for. AC-9 is about a parameter the browser
// never sees, so the only place to observe it is here.
const seen: { path: string; query: Record<string, string> }[] = [];

function route(url: URL): { status: number; body: string } {
  const path = url.pathname;

  if (path === '/__requests') return json({ data: seen });
  if (path === '/__requests/reset') {
    seen.length = 0;
    return json({ data: [] });
  }

  // A minimal MapLibre style, so the map test does not depend on
  // OpenFreeMap being up or reachable. No sources and no sprites: the test
  // is about the pins and the requests, not about tiles.
  if (path === '/map-style.json') {
    return json({ version: 8, name: 'fixture', sources: {}, layers: [] });
  }

  // AC-11: forty pins in one box.
  if (path === '/v1/events/map') {
    const pins = Array.from({ length: 40 }, (_, index) => ({
      id: `pin-${index}`,
      event_id: `event-${index}`,
      slug: index === 0 ? 'lido-saturday' : `meet-${index}`,
      title: index === 0 ? 'Lido Saturday' : `Meet ${index}`,
      // Inside the default viewport and spread across it, so they neither
      // fall outside the box nor collapse into a single cluster.
      lat: 33.52 + index * 0.005,
      lng: -118.1 + index * 0.009,
      starts_at: '2026-10-24T14:30:00Z',
      going_count: index,
      recurring: index % 2 === 0,
    }));
    return json({ data: pins, meta: { truncated: false } });
  }

  if (path === '/v1/health') return json({ data: { status: 'ok' } });

  if (path === '/v1/feed') return json({ data: FEED, meta: { generated_at: new Date().toISOString() } });

  if (path === '/v1/sitemap') {
    return json({
      events: [{ slug: 'lido-saturday', updated_at: '2026-09-01T00:00:00Z' }],
      clubs: [{ slug: 'back-bay-air-cooled', updated_at: '2026-09-01T00:00:00Z' }],
      sponsors: [{ slug: 'bear-coast', updated_at: '2026-09-01T00:00:00Z' }],
      spots: [],
    });
  }

  if (path === '/v1/events') {
    const q = url.searchParams.get('q');
    // AC-10's second half: a query that matches nothing, so the no-results
    // copy has something to render against.
    const items = q && q !== 'lido' ? [] : [eventSummary()];
    return json({ data: items, meta: { next_cursor: null, total: items.length } });
  }

  if (path === '/v1/clubs') return json({ data: [CLUB], meta: { next_cursor: null, total: 1 } });

  const clubMatch = /^\/v1\/clubs\/([^/]+)$/.exec(path);
  if (clubMatch) {
    const slug = decodeURIComponent(clubMatch[1] ?? '');
    // clubs.md R-5: a hidden club is a 404 on every public endpoint.
    return slug === CLUB.slug ? json({ data: CLUB }) : error('not_found', 'Not found', 404);
  }
  if (/^\/v1\/clubs\/[^/]+\/members$/.test(path)) {
    return json({ data: CLUB_MEMBERS, meta: { next_cursor: null, total: 1 } });
  }

  const sponsorMatch = /^\/v1\/sponsors\/([^/]+)$/.exec(path);
  if (sponsorMatch) {
    const slug = decodeURIComponent(sponsorMatch[1] ?? '');
    return slug === SPONSOR.slug ? json({ data: SPONSOR }) : error('not_found', 'Not found', 404);
  }

  const userMatch = /^\/v1\/users\/([^/]+)$/.exec(path);
  if (userMatch) {
    const handle = decodeURIComponent(userMatch[1] ?? '');
    return handle === PROFILE.handle ? json({ data: PROFILE }) : error('not_found', 'Not found', 404);
  }
  if (/^\/v1\/users\/[^/]+\/events$/.test(path)) {
    return json({ data: [eventSummary()], meta: { next_cursor: null, total: 1 } });
  }
  if (/^\/v1\/users\/[^/]+\/clubs$/.test(path)) {
    return json({ data: [{ ...CLUB, role: 'owner' }] });
  }

  const eventMatch = /^\/v1\/events\/([^/]+)$/.exec(path);
  if (eventMatch) {
    const slug = decodeURIComponent(eventMatch[1] ?? '');
    if (slug === UNLISTED.slug) {
      // AC-3: 404 without the token, 200 with it.
      return url.searchParams.get('token') === UNLISTED_TOKEN
        ? json({ data: UNLISTED })
        : error('not_found', 'Not found', 404);
    }
    if (slug === 'gone-meet') {
      return error('gone', 'This meet is no longer listed.', 410, { nearby: [eventSummary()] });
    }
    const event = EVENTS[slug];
    return event ? json({ data: event }) : error('not_found', 'Not found', 404);
  }

  const occurrenceMatch = /^\/v1\/occurrences\/([^/]+)$/.exec(path);
  if (occurrenceMatch) {
    const id = decodeURIComponent(occurrenceMatch[1] ?? '');
    // AC-4: one date a host edited, one the materializer wrote.
    if (id === 'overridden') {
      return json({
        data: occurrence({ id: 'overridden', overridden_at: '2026-10-20T12:00:00Z' }),
      });
    }
    if (id === occurrence().id) return json({ data: occurrence() });
    return error('not_found', 'Not found', 404);
  }

  return error('not_found', 'Not found', 404);
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://localhost:${PORT}`);
  if (url.pathname.startsWith('/v1/')) {
    seen.push({ path: url.pathname, query: Object.fromEntries(url.searchParams) });
  }
  const { status, body } = route(url);
  // W05 is the first surface that calls the API from the browser rather
  // than from a loader, so the fixture answers preflight the way the real
  // API does through rack-cors (apps/api/config/initializers/cors.rb).
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
  };
  if (request.method === 'OPTIONS') {
    response.writeHead(204, cors);
    response.end();
    return;
  }
  response.writeHead(status, { 'Content-Type': 'application/json', ...cors });
  response.end(body);
});

server.listen(PORT, () => {
  // Playwright waits on this line before starting the web server.
  process.stdout.write(`fixture api listening on ${PORT}\n`);
});

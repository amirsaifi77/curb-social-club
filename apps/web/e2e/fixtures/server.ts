import { createServer } from 'node:http';

import {
  CANCELLED,
  FEED,
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

  if (path === '/v1/health') return json({ data: { status: 'ok' } });

  if (path === '/v1/feed') return json({ data: FEED, meta: { generated_at: new Date().toISOString() } });

  if (path === '/v1/events') {
    const q = url.searchParams.get('q');
    // AC-10's second half: a query that matches nothing, so the no-results
    // copy has something to render against.
    const items = q && q !== 'lido' ? [] : [eventSummary()];
    return json({ data: items, meta: { next_cursor: null, total: items.length } });
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
  response.writeHead(status, { 'Content-Type': 'application/json' });
  response.end(body);
});

server.listen(PORT, () => {
  // Playwright waits on this line before starting the web server.
  process.stdout.write(`fixture api listening on ${PORT}\n`);
});

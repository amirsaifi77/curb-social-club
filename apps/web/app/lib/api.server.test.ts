import { describe, expect, it } from 'vitest';

import { apiBaseUrl, fetchApiHealth, nearFromRequest, parseNear } from './api.server';

describe('apiBaseUrl', () => {
  it('falls back to localhost:3000 and strips trailing slashes', () => {
    expect(apiBaseUrl(undefined)).toBe('http://localhost:3000');
    expect(apiBaseUrl('')).toBe('http://localhost:3000');
    expect(apiBaseUrl('https://curb-api-staging.onrender.com/')).toBe(
      'https://curb-api-staging.onrender.com',
    );
  });
});

describe('fetchApiHealth', () => {
  it('reports ok with the health status from the envelope', async () => {
    const fetchImpl = (async () =>
      new Response(JSON.stringify({ data: { status: 'ok' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })) as typeof fetch;
    await expect(fetchApiHealth('https://api.test', fetchImpl)).resolves.toEqual({
      ok: true,
      status: 200,
      detail: 'ok',
    });
  });

  it('reports a non-2xx status and never throws on a network failure', async () => {
    const failing = (async () => new Response('', { status: 503 })) as typeof fetch;
    await expect(fetchApiHealth('https://api.test', failing)).resolves.toEqual({
      ok: false,
      status: 503,
    });

    const throwing = (async () => {
      throw new TypeError('fetch failed');
    }) as typeof fetch;
    await expect(fetchApiHealth('https://api.test', throwing)).resolves.toEqual({
      ok: false,
      detail: 'TypeError',
    });
  });
});

describe('nearFromRequest and parseNear', () => {
  it('AC-9: rounds the Vercel IP headers to two decimals before they are sent', () => {
    const request = new Request('https://curbsocial.club/', {
      headers: {
        'x-vercel-ip-latitude': '33.6189',
        'x-vercel-ip-longitude': '-117.9289',
      },
    });

    expect(nearFromRequest(request)).toBe('33.62,-117.93');
  });

  it('R-13: falls back to coastal Orange County with no headers', () => {
    expect(nearFromRequest(new Request('https://curbsocial.club/'))).toBe('33.62,-117.93');
  });

  it('re-rounds a near the reader put in the URL rather than trusting it', () => {
    // The query string is editable, and six decimals in a server log is
    // exactly what R-2 exists to prevent.
    expect(parseNear('33.618912,-117.928934')).toBe('33.62,-117.93');
  });

  it('refuses a near that is not a coordinate', () => {
    expect(parseNear('somewhere')).toBeNull();
    expect(parseNear('91,0')).toBeNull();
    expect(parseNear('0,181')).toBeNull();
    expect(parseNear(null)).toBeNull();
  });
});

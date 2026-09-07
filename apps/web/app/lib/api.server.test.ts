import { describe, expect, it } from 'vitest';

import { apiBaseUrl, fetchApiHealth } from './api.server';

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

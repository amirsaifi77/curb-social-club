import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { ApiError, createClient } from './client';
import { queryKeys } from './keys';
import {
  feedQuery,
  healthQuery,
  meQuery,
  registerDeviceMutation,
  signInWithGoogleMutation,
  signOutMutation,
} from './queries';
import { api } from './requests';

const user = {
  id: 'u1',
  email: 'ada@example.com',
  role: 'member',
  status: 'active',
  created_at: '2026-09-07T00:00:00Z',
  profile: {
    id: 'u1',
    handle: 'ada',
    display_name: 'Ada',
    is_host: false,
    links: {},
    clubs: [],
    counts: {},
    viewer: {},
  },
  identities: [],
  notification_prefs: {},
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function clientWith(fetchMock: (request: Request) => Promise<Response>) {
  return createClient({
    baseUrl: 'https://api.example',
    fetch: fetchMock as unknown as typeof fetch,
    getToken: () => 'tok',
  });
}

describe('query options', () => {
  it('fetches me through the query client under the shared key', async () => {
    const fetchMock = vi.fn(async (_request: Request) => jsonResponse(200, { data: user }));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const result = await queryClient.fetchQuery(meQuery(clientWith(fetchMock)));

    expect(result.profile.handle).toBe('ada');
    expect(queryClient.getQueryData(queryKeys.me())).toEqual(user);
    const request = fetchMock.mock.calls[0]?.[0];
    expect(request && new URL(request.url).pathname).toBe('/v1/me');
  });

  it('surfaces the error envelope as ApiError without retrying a 4xx', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(401, { error: { code: 'unauthenticated', message: 'Sign in to continue' } }),
    );
    const queryClient = new QueryClient();

    await expect(queryClient.fetchQuery(meQuery(clientWith(fetchMock)))).rejects.toMatchObject({
      name: 'ApiError',
      code: 'unauthenticated',
      status: 401,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('sends near and radius_km to the feed and caches under the shared key', async () => {
    const sections = [{ kind: 'this_weekend', title: 'This weekend', items: [], more: null }];
    const fetchMock = vi.fn(async (_request: Request) =>
      jsonResponse(200, { data: { sections }, meta: { generated_at: '2026-10-01T00:00:00Z' } }),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const query = { near: '33.62,-117.93', radius_km: 32 };

    const result = await queryClient.fetchQuery(feedQuery(clientWith(fetchMock), query));

    expect(result.sections).toEqual(sections);
    expect(queryClient.getQueryData(queryKeys.feed(query))).toEqual({ sections });
    const request = fetchMock.mock.calls[0]?.[0];
    const url = request && new URL(request.url);
    expect(url?.pathname).toBe('/v1/feed');
    // R-1: the caller rounds, and what it rounded is what goes on the wire.
    expect(url?.searchParams.get('near')).toBe('33.62,-117.93');
    expect(url?.searchParams.get('radius_km')).toBe('32');
  });

  it('reads health', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(200, { status: 'ok', db: true, queue_lag_s: 0 }),
    );
    const queryClient = new QueryClient();
    await expect(queryClient.fetchQuery(healthQuery(clientWith(fetchMock)))).resolves.toEqual({
      status: 'ok',
      db: true,
      queue_lag_s: 0,
    });
  });
});

describe('mutations and request functions', () => {
  it('posts the Google id token and returns the sign-in body', async () => {
    const fetchMock = vi.fn(async (request: Request) => {
      expect(await request.json()).toEqual({ id_token: 'id' });
      return jsonResponse(201, { data: { token: 't', user, is_new: true } });
    });
    const result = await signInWithGoogleMutation(clientWith(fetchMock)).mutationFn({
      id_token: 'id',
    });
    expect(result.data.is_new).toBe(true);
    expect(result.data.token).toBe('t');
  });

  it('registers a device and returns the device', async () => {
    const fetchMock = vi.fn(async (request: Request) => {
      expect(request.method).toBe('POST');
      const body = (await request.json()) as { anonymous_id: string };
      return jsonResponse(201, { data: { anonymous_id: body.anonymous_id, platform: 'ios' } });
    });
    const device = await registerDeviceMutation(clientWith(fetchMock)).mutationFn({
      anonymous_id: 'd1',
      platform: 'ios',
    });
    expect(device.anonymous_id).toBe('d1');
  });

  it('treats a 204 sign-out as success and a failed one as ApiError', async () => {
    const ok = clientWith(vi.fn(async () => new Response(null, { status: 204 })));
    await expect(signOutMutation(ok).mutationFn()).resolves.toBeUndefined();

    const failing = clientWith(vi.fn(async () => jsonResponse(500, {})));
    await expect(api.auth.signOut(failing)).rejects.toBeInstanceOf(ApiError);
  });
});

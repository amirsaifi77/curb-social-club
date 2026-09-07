import type { User } from '@curb/api-client';
import { describe, expect, it, jest } from '@jest/globals';

import {
  createAuthStore,
  isSuspendedError,
  USER_CACHE_KEY,
  type AppleCredential,
} from './auth-store';
import type { TokenStore } from './session-token';
import type { KeyValueStore } from './storage';

const user: User = {
  id: 'u1',
  email: 'ada@example.com',
  role: 'member',
  status: 'active',
  created_at: '2026-09-07T00:00:00Z',
  profile: {
    id: 'u1',
    handle: 'ada',
    display_name: 'Ada',
    bio: null,
    avatar_url: null,
    home_label: null,
    is_host: false,
    links: {},
    clubs: [],
    counts: {},
    viewer: { following: false, blocked: false, is_self: true, reported: false },
  },
  identities: [{ provider: 'google', email: 'ada@example.com' }],
  notification_prefs: {},
};

function fakeTokenStore(initial: string | null = null): TokenStore & { token: string | null } {
  const store = {
    token: initial,
    get: async () => store.token,
    set: async (token: string) => {
      store.token = token;
    },
    clear: async () => {
      store.token = null;
    },
  };
  return store;
}

function fakeCache(
  initial: Record<string, string> = {},
): KeyValueStore & { map: Map<string, string> } {
  const map = new Map(Object.entries(initial));
  return {
    map,
    set: (k, v) => void map.set(k, v),
    getString: (k) => map.get(k),
    remove: (k) => void map.delete(k),
  };
}

type Route = (request: Request) => Response | Promise<Response>;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function fakeFetch(routes: Record<string, Route>) {
  const calls: Request[] = [];
  const fetchImpl = async (input: Request | string | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(String(input), init);
    calls.push(request);
    const key = `${request.method} ${new URL(request.url).pathname}`;
    const route = routes[key];
    if (!route) throw new Error(`no route for ${key}`);
    return route(request);
  };
  return { fetchImpl: fetchImpl as unknown as typeof fetch, calls };
}

const signInBody = (isNew: boolean) => ({ data: { token: 'tok-1', user, is_new: isNew } });
const unauthenticated = () => json(401, { error: { code: 'unauthenticated', message: 'x' } });

function makeStore(overrides: {
  routes?: Record<string, Route>;
  token?: string | null;
  cache?: ReturnType<typeof fakeCache>;
  apple?: () => Promise<AppleCredential | null>;
  google?: () => Promise<string | null>;
}) {
  const tokenStore = fakeTokenStore(overrides.token ?? null);
  const cache = overrides.cache ?? fakeCache();
  const { fetchImpl, calls } = fakeFetch(overrides.routes ?? {});
  const openSignIn = jest.fn();
  const store = createAuthStore({
    baseUrl: 'https://api.example',
    tokenStore,
    cache,
    deviceId: () => 'device-1',
    providers: {
      apple: overrides.apple ?? (async () => null),
      google: overrides.google ?? (async () => 'google-id-token'),
    },
    openSignIn,
    fetch: fetchImpl,
  });
  return { store, tokenStore, cache, calls, openSignIn };
}

describe('pending action (R-21)', () => {
  it('opens the sheet, then runs the action exactly once after the sheet closes', async () => {
    const { store, openSignIn } = makeStore({
      routes: { 'POST /v1/auth/google': () => json(201, signInBody(true)) },
    });
    const action = jest.fn<() => void>();

    expect(store.requireSignIn(action)).toBe(false);
    expect(openSignIn).toHaveBeenCalledTimes(1);

    const outcome = await store.signInWithGoogle();
    expect(outcome).toMatchObject({ cancelled: false, isNew: true });
    expect(action).not.toHaveBeenCalled();

    await store.runPendingAction();
    expect(action).toHaveBeenCalledTimes(1);
    await store.runPendingAction();
    expect(action).toHaveBeenCalledTimes(1);
    expect(store.hasPendingAction()).toBe(false);
  });

  it('opens the sheet once for repeated taps while signed out', () => {
    const { store, openSignIn } = makeStore({});
    store.requireSignIn(jest.fn<() => void>());
    store.requireSignIn(jest.fn<() => void>());
    expect(openSignIn).toHaveBeenCalledTimes(1);
  });

  it('runs immediately when already signed in and keeps a failing action from throwing', async () => {
    const { store } = makeStore({
      routes: { 'POST /v1/auth/google': () => json(200, signInBody(false)) },
    });
    await store.signInWithGoogle();
    const action = jest.fn<() => Promise<void>>(async () => {
      throw new Error('rsvp failed');
    });
    expect(store.requireSignIn(action)).toBe(true);
    await store.runPendingAction();
    expect(action).toHaveBeenCalledTimes(1);
  });

  it('drops the action when the sheet is cancelled', async () => {
    const { store } = makeStore({
      routes: { 'POST /v1/auth/google': () => json(200, signInBody(false)) },
    });
    const action = jest.fn<() => void>();
    store.requireSignIn(action);
    store.cancelSignIn();
    await store.signInWithGoogle();
    await store.runPendingAction();
    expect(action).not.toHaveBeenCalled();
  });

  it('runs an action queued during hydration once after hydrate succeeds', async () => {
    const { store, openSignIn } = makeStore({
      token: 'stored',
      routes: { 'GET /v1/me': () => json(200, { data: user }) },
    });
    const action = jest.fn<() => void>();
    const hydrating = store.hydrate();
    expect(store.requireSignIn(action)).toBe(false);
    expect(openSignIn).not.toHaveBeenCalled();
    await hydrating;
    expect(action).toHaveBeenCalledTimes(1);
    expect(store.getState().status).toBe('signedIn');
  });

  it('opens the sheet for an action queued during hydration when the token turns out dead', async () => {
    const { store, openSignIn } = makeStore({
      token: 'dead',
      routes: { 'GET /v1/me': unauthenticated },
    });
    const action = jest.fn<() => void>();
    const hydrating = store.hydrate();
    store.requireSignIn(action);
    await hydrating;
    expect(openSignIn).toHaveBeenCalledTimes(1);
    expect(action).not.toHaveBeenCalled();
    expect(store.hasPendingAction()).toBe(true);
  });

  it('reports a provider cancel without calling the API', async () => {
    const { store, calls } = makeStore({ google: async () => null });
    expect(await store.signInWithGoogle()).toEqual({ cancelled: true });
    expect(calls).toHaveLength(0);
    expect(store.getState().status).toBe('signedOut');
  });
});

describe('hydrate (R-25)', () => {
  it('stays signed out without a stored token', async () => {
    const { store, calls } = makeStore({});
    await store.hydrate();
    expect(store.getState().status).toBe('signedOut');
    expect(calls).toHaveLength(0);
  });

  it('loads the user once with a stored token and caches it', async () => {
    const { store, calls, cache } = makeStore({
      token: 'stored',
      routes: { 'GET /v1/me': () => json(200, { data: user }) },
    });
    await store.hydrate();
    await store.hydrate();
    expect(store.getState()).toMatchObject({
      status: 'signedIn',
      user: { id: 'u1' },
      stale: false,
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]?.headers.get('Authorization')).toBe('Bearer stored');
    expect(calls[0]?.headers.get('X-Device-Id')).toBe('device-1');
    expect(JSON.parse(cache.map.get(USER_CACHE_KEY) ?? 'null')).toMatchObject({ id: 'u1' });
  });

  it('clears the token and the cached user on 401', async () => {
    const cache = fakeCache({ [USER_CACHE_KEY]: JSON.stringify(user) });
    const { store, tokenStore } = makeStore({
      token: 'stale',
      cache,
      routes: { 'GET /v1/me': unauthenticated },
    });
    await store.hydrate();
    expect(tokenStore.token).toBeNull();
    expect(cache.map.has(USER_CACHE_KEY)).toBe(false);
    expect(store.getState()).toMatchObject({ status: 'signedOut', user: null });
  });

  it('shows the cached user immediately and keeps it with the token on a network failure (AC-17)', async () => {
    const cache = fakeCache({ [USER_CACHE_KEY]: JSON.stringify(user) });
    const { store, tokenStore } = makeStore({
      token: 'kept',
      cache,
      routes: {
        'GET /v1/me': () => {
          throw new TypeError('Network request failed');
        },
      },
    });
    const seen: string[] = [];
    store.subscribe(() =>
      seen.push(`${store.getState().status}:${store.getState().user?.profile.handle ?? '-'}`),
    );
    await store.hydrate();
    expect(seen[0]).toBe('hydrating:ada');
    expect(tokenStore.token).toBe('kept');
    expect(store.getState()).toMatchObject({
      status: 'signedIn',
      stale: true,
      user: { profile: { handle: 'ada' } },
    });
  });

  it('signs out a suspended account instead of keeping it stale', async () => {
    const { store, tokenStore } = makeStore({
      token: 'suspended',
      routes: {
        'GET /v1/me': () =>
          json(403, {
            error: { code: 'forbidden', message: 'x', details: { reason: 'suspended' } },
          }),
      },
    });
    await store.hydrate();
    expect(tokenStore.token).toBeNull();
    expect(store.getState().status).toBe('signedOut');
  });
});

describe('token handling (R-24)', () => {
  it('stores the token and user on sign-in and clears both on any later 401', async () => {
    const { store, tokenStore, cache } = makeStore({
      routes: {
        'POST /v1/auth/apple': () => json(201, signInBody(true)),
        'GET /v1/me': unauthenticated,
      },
      apple: async () => ({
        identityToken: 'id',
        authorizationCode: 'code',
        nonce: 'raw',
        fullName: null,
      }),
    });
    await store.signInWithApple();
    expect(tokenStore.token).toBe('tok-1');
    expect(cache.map.has(USER_CACHE_KEY)).toBe(true);

    await store.client.GET('/v1/me');
    expect(tokenStore.token).toBeNull();
    expect(cache.map.has(USER_CACHE_KEY)).toBe(false);
    expect(store.getState().status).toBe('signedOut');
  });

  it('sends the raw nonce, code, and full name to the API', async () => {
    const { store, calls } = makeStore({
      routes: { 'POST /v1/auth/apple': () => json(201, signInBody(true)) },
      apple: async () => ({
        identityToken: 'id',
        authorizationCode: 'code',
        nonce: 'raw-nonce',
        fullName: { givenName: 'Ada', familyName: 'Lovelace' },
      }),
    });
    await store.signInWithApple();
    expect(await calls[0]?.json()).toEqual({
      identity_token: 'id',
      authorization_code: 'code',
      nonce: 'raw-nonce',
      full_name: { givenName: 'Ada', familyName: 'Lovelace' },
    });
  });

  it('surfaces a suspended account as a recognizable error', async () => {
    const { store } = makeStore({
      routes: {
        'POST /v1/auth/google': () =>
          json(403, {
            error: { code: 'forbidden', message: 'suspended', details: { reason: 'suspended' } },
          }),
      },
    });
    let caught: unknown;
    try {
      await store.signInWithGoogle();
    } catch (error) {
      caught = error;
    }
    expect(isSuspendedError(caught)).toBe(true);
    expect(caught).toMatchObject({ status: 403, details: { reason: 'suspended' } });
  });

  it('signs out locally even when the API call fails, and deletes the account then signs out', async () => {
    const { store, tokenStore } = makeStore({
      routes: {
        'POST /v1/auth/google': () => json(200, signInBody(false)),
        'DELETE /v1/auth/session': () => {
          throw new TypeError('Network request failed');
        },
        'DELETE /v1/me': () => json(202, { data: { purge_after: '2026-10-07T00:00:00Z' } }),
      },
    });
    await store.signInWithGoogle();
    await store.signOut();
    expect(tokenStore.token).toBeNull();
    expect(store.getState().status).toBe('signedOut');

    await store.signInWithGoogle();
    expect(await store.deleteAccount()).toBe('2026-10-07T00:00:00Z');
    expect(tokenStore.token).toBeNull();
    expect(store.getState().status).toBe('signedOut');
  });
});

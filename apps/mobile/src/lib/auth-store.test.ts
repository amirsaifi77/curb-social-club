import type { User } from '@curb/api-client';
import { describe, expect, it, jest } from '@jest/globals';

import { createAuthStore, isSuspendedError, type AppleCredential } from './auth-store';
import type { TokenStore } from './session-token';

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

function makeStore(overrides: {
  routes?: Record<string, Route>;
  token?: string | null;
  apple?: () => Promise<AppleCredential | null>;
  google?: () => Promise<string | null>;
}) {
  const tokenStore = fakeTokenStore(overrides.token ?? null);
  const { fetchImpl, calls } = fakeFetch(overrides.routes ?? {});
  const openSignIn = jest.fn();
  const store = createAuthStore({
    baseUrl: 'https://api.example',
    tokenStore,
    deviceId: () => 'device-1',
    providers: {
      apple: overrides.apple ?? (async () => null),
      google: overrides.google ?? (async () => 'google-id-token'),
    },
    openSignIn,
    fetch: fetchImpl,
  });
  return { store, tokenStore, calls, openSignIn };
}

describe('pending action (R-21)', () => {
  it('opens the sheet, then runs the action exactly once after sign-in', async () => {
    const { store, openSignIn } = makeStore({
      routes: { 'POST /v1/auth/google': () => json(201, signInBody(true)) },
    });
    const action = jest.fn<() => void>();

    expect(store.requireSignIn(action)).toBe(false);
    expect(openSignIn).toHaveBeenCalledTimes(1);
    expect(action).not.toHaveBeenCalled();

    const outcome = await store.signInWithGoogle();
    expect(outcome).toMatchObject({ cancelled: false, isNew: true });
    expect(action).toHaveBeenCalledTimes(1);

    await store.signInWithGoogle();
    expect(action).toHaveBeenCalledTimes(1);
    expect(store.hasPendingAction()).toBe(false);
  });

  it('runs immediately when already signed in', async () => {
    const { store } = makeStore({
      routes: { 'POST /v1/auth/google': () => json(200, signInBody(false)) },
    });
    await store.signInWithGoogle();
    const action = jest.fn<() => void>();
    expect(store.requireSignIn(action)).toBe(true);
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
    expect(action).not.toHaveBeenCalled();
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

  it('loads the user once with a stored token', async () => {
    const { store, calls } = makeStore({
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
  });

  it('clears the token and signs out on 401', async () => {
    const { store, tokenStore } = makeStore({
      token: 'stale',
      routes: {
        'GET /v1/me': () => json(401, { error: { code: 'unauthenticated', message: 'x' } }),
      },
    });
    await store.hydrate();
    expect(tokenStore.token).toBeNull();
    expect(store.getState().status).toBe('signedOut');
  });

  it('keeps the token and treats the person as signed in with stale data on a network failure', async () => {
    const { store, tokenStore } = makeStore({
      token: 'kept',
      routes: {
        'GET /v1/me': () => {
          throw new TypeError('Network request failed');
        },
      },
    });
    await store.hydrate();
    expect(tokenStore.token).toBe('kept');
    expect(store.getState()).toMatchObject({ status: 'signedIn', stale: true });
  });
});

describe('token handling (R-24)', () => {
  it('stores the token on sign-in and clears it on any later 401', async () => {
    const { store, tokenStore } = makeStore({
      routes: {
        'POST /v1/auth/apple': () => json(201, signInBody(true)),
        'GET /v1/me': () => json(401, { error: { code: 'unauthenticated', message: 'x' } }),
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

    await store.client.GET('/v1/me');
    expect(tokenStore.token).toBeNull();
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

// Auth state, the sign-in flows, and the pending-action pattern (R-21,
// R-24, R-25). Pure: every platform dependency is injected so the store is
// unit-testable; src/lib/auth.ts builds the app instance.
import { api, ApiError, createClient, type ApiClient, type User } from '@curb/api-client';
import { useSyncExternalStore } from 'react';

import type { TokenStore } from './session-token';
import type { KeyValueStore } from './storage';

export type AuthStatus = 'signedOut' | 'hydrating' | 'signedIn';

export interface AuthState {
  status: AuthStatus;
  // The last user this phone saw; kept across launches so the app works
  // offline (R-25, AC-17). Null only when no sign-in has completed.
  user: User | null;
  // Signed in with a stored token but GET /me could not be refreshed.
  stale: boolean;
}

export type PendingAction = () => void | Promise<void>;

export interface AppleCredential {
  identityToken: string;
  authorizationCode: string;
  // Raw nonce; the provider sent its SHA256 to Apple (R-23).
  nonce: string;
  fullName: { givenName?: string | null; familyName?: string | null } | null;
}

// Providers resolve null when the person cancelled (no message is shown).
export interface AuthProviders {
  apple(): Promise<AppleCredential | null>;
  google(): Promise<string | null>;
}

export interface AuthStoreDeps {
  baseUrl: string;
  tokenStore: TokenStore;
  // Persists the cached user under USER_CACHE_KEY.
  cache: KeyValueStore;
  deviceId: () => string;
  providers: AuthProviders;
  openSignIn?: () => void;
  fetch?: typeof fetch;
}

export type SignInOutcome = { cancelled: true } | { cancelled: false; isNew: boolean; user: User };

export const USER_CACHE_KEY = 'curb.me';

export function isSuspendedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403 && error.details?.reason === 'suspended';
}

function readCachedUser(cache: KeyValueStore): User | null {
  try {
    const raw = cache.getString(USER_CACHE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function createAuthStore(deps: AuthStoreDeps) {
  let state: AuthState = { status: 'signedOut', user: null, stale: false };
  let pending: PendingAction | null = null;
  let hydrated = false;
  let hydrating = false;
  // In-memory copy so the Keychain is read once per launch, not per request.
  let token: string | null | undefined;
  const listeners = new Set<() => void>();

  const emit = () => listeners.forEach((listener) => listener());
  const setState = (next: Partial<AuthState>) => {
    state = { ...state, ...next };
    emit();
  };

  async function readToken(): Promise<string | null> {
    if (token === undefined) token = await deps.tokenStore.get();
    return token;
  }

  function rememberUser(user: User): void {
    deps.cache.set(USER_CACHE_KEY, JSON.stringify(user));
  }

  // Any 401 clears the token, the cached user, and resets to signed out (R-24).
  async function signOutLocally(): Promise<void> {
    token = null;
    await deps.tokenStore.clear();
    deps.cache.remove(USER_CACHE_KEY);
    setState({ status: 'signedOut', user: null, stale: false });
  }

  const client: ApiClient = createClient({
    baseUrl: deps.baseUrl,
    fetch: deps.fetch,
    getToken: readToken,
    getDeviceId: deps.deviceId,
    onUnauthorized: signOutLocally,
  });

  // Runs the queued gated action once, after the sheet has closed or hydrate
  // has confirmed the session. Its failures belong to the action's own UI,
  // never to the sign-in flow.
  async function runPendingAction(): Promise<void> {
    const action = pending;
    pending = null;
    if (!action) return;
    try {
      await action();
    } catch {
      // The action's own screen reports its error.
    }
  }

  async function completeSignIn(nextToken: string, user: User): Promise<void> {
    token = nextToken;
    await deps.tokenStore.set(nextToken);
    rememberUser(user);
    setState({ status: 'signedIn', user, stale: false });
  }

  // Once per launch (R-25): with a stored token the cached user shows at
  // once, then GET /me refreshes it. A 401 signs out (client middleware); a
  // suspended 403 signs out too; any other failure keeps the token and
  // marks the user stale. A gated action queued meanwhile runs after
  // success or opens the sheet after sign-out.
  async function hydrate(): Promise<void> {
    if (hydrated) return;
    hydrated = true;
    // Set before the first await so an action queued while the token is
    // being read is deferred rather than opening the sheet.
    hydrating = true;
    let stored: string | null = null;
    try {
      stored = await readToken();
    } catch {
      stored = null;
    }
    if (!stored) {
      hydrating = false;
      setState({ status: 'signedOut', user: null, stale: false });
      if (pending) deps.openSignIn?.();
      return;
    }
    setState({ status: 'hydrating', user: readCachedUser(deps.cache) });
    try {
      const { data: user } = await api.me.get(client);
      rememberUser(user);
      setState({ status: 'signedIn', user, stale: false });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        // The client middleware already signed out.
      } else if (isSuspendedError(error)) {
        await signOutLocally();
      } else {
        setState({ status: 'signedIn', stale: true });
      }
    } finally {
      hydrating = false;
    }
    if (state.status === 'signedIn') await runPendingAction();
    else if (pending) deps.openSignIn?.();
  }

  async function signInWithApple(): Promise<SignInOutcome> {
    const credential = await deps.providers.apple();
    if (!credential) return { cancelled: true };
    const body = await api.auth.apple(client, {
      identity_token: credential.identityToken,
      authorization_code: credential.authorizationCode,
      nonce: credential.nonce,
      full_name: credential.fullName,
    });
    await completeSignIn(body.data.token, body.data.user);
    return { cancelled: false, isNew: body.data.is_new, user: body.data.user };
  }

  async function signInWithGoogle(): Promise<SignInOutcome> {
    const idToken = await deps.providers.google();
    if (!idToken) return { cancelled: true };
    const body = await api.auth.google(client, { id_token: idToken });
    await completeSignIn(body.data.token, body.data.user);
    return { cancelled: false, isNew: body.data.is_new, user: body.data.user };
  }

  // Sign out on this device only (R-12). Local state clears even when the
  // request fails offline; the server row then expires or the nightly sweep
  // removes it, so the phone never stays signed in by accident.
  async function signOut(): Promise<void> {
    try {
      await api.auth.signOut(client);
    } catch {
      // Offline or the token was already invalid; nothing else to do.
    }
    await signOutLocally();
  }

  // DELETE /me, then local sign-out; returns purge_after (R-26).
  async function deleteAccount(): Promise<string> {
    const body = await api.me.destroy(client);
    await signOutLocally();
    return body.data.purge_after;
  }

  // A gated action runs now when signed in. Otherwise it waits: during
  // hydration for the outcome, when signed out for the next successful
  // sign-in, with the sheet opened once (R-21). Returns whether it ran.
  function requireSignIn(action: PendingAction): boolean {
    if (state.status === 'signedIn') {
      pending = action;
      void runPendingAction();
      return true;
    }
    const alreadyWaiting = pending !== null;
    pending = action;
    if (!hydrating && !alreadyWaiting) deps.openSignIn?.();
    return false;
  }

  // Cancelling the sheet drops the pending action without an error (R-21).
  function cancelSignIn(): void {
    pending = null;
  }

  const getState = () => state;
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return {
    client,
    getState,
    subscribe,
    hasPendingAction: () => pending !== null,
    hydrate,
    signInWithApple,
    signInWithGoogle,
    signOut,
    deleteAccount,
    requireSignIn,
    runPendingAction,
    cancelSignIn,
    useAuth(): AuthState {
      return useSyncExternalStore(subscribe, getState, getState);
    },
  };
}

export type AuthStore = ReturnType<typeof createAuthStore>;

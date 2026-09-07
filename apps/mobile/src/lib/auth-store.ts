// Auth state, the sign-in flows, and the pending-action pattern (R-21,
// R-24, R-25). Pure: every platform dependency is injected so the store is
// unit-testable; src/lib/auth.ts builds the app instance.
import { ApiError, createClient, unwrap, type ApiClient, type User } from '@curb/api-client';
import { useSyncExternalStore } from 'react';

import type { TokenStore } from './session-token';

export type AuthStatus = 'signedOut' | 'hydrating' | 'signedIn';

export interface AuthState {
  status: AuthStatus;
  user: User | null;
  // Signed in with a stored token but GET /me could not be refreshed (R-25).
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
  deviceId: () => string;
  providers: AuthProviders;
  openSignIn?: () => void;
  fetch?: typeof fetch;
}

export type SignInOutcome = { cancelled: true } | { cancelled: false; isNew: boolean; user: User };

export function isSuspendedError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403 && error.details?.reason === 'suspended';
}

export function createAuthStore(deps: AuthStoreDeps) {
  let state: AuthState = { status: 'signedOut', user: null, stale: false };
  let pending: PendingAction | null = null;
  let hydrated = false;
  const listeners = new Set<() => void>();

  const emit = () => listeners.forEach((listener) => listener());
  const setState = (next: Partial<AuthState>) => {
    state = { ...state, ...next };
    emit();
  };

  // Any 401 clears the token and resets to signed out (R-24).
  async function signOutLocally(): Promise<void> {
    await deps.tokenStore.clear();
    setState({ status: 'signedOut', user: null, stale: false });
  }

  const client: ApiClient = createClient({
    baseUrl: deps.baseUrl,
    fetch: deps.fetch,
    getToken: () => deps.tokenStore.get(),
    getDeviceId: deps.deviceId,
    onUnauthorized: signOutLocally,
  });

  async function runPending(): Promise<void> {
    const action = pending;
    pending = null;
    if (action) await action();
  }

  async function completeSignIn(token: string, user: User): Promise<void> {
    await deps.tokenStore.set(token);
    setState({ status: 'signedIn', user, stale: false });
    await runPending();
  }

  // Once per launch: refresh the user when a token is stored. A 401 signs
  // out (through the client middleware); any other failure keeps the token
  // and treats the person as signed in with stale data (R-25).
  async function hydrate(): Promise<void> {
    if (hydrated) return;
    hydrated = true;
    const token = await deps.tokenStore.get();
    if (!token) {
      setState({ status: 'signedOut', user: null, stale: false });
      return;
    }
    setState({ status: 'hydrating' });
    try {
      const result = await client.GET('/v1/me');
      if (result.response.status === 401) return; // middleware already signed out
      if (result.data) {
        setState({ status: 'signedIn', user: result.data.data, stale: false });
      } else {
        setState({ status: 'signedIn', stale: true });
      }
    } catch {
      setState({ status: 'signedIn', stale: true });
    }
  }

  async function signInWithApple(): Promise<SignInOutcome> {
    const credential = await deps.providers.apple();
    if (!credential) return { cancelled: true };
    const result = await client.POST('/v1/auth/apple', {
      body: {
        identity_token: credential.identityToken,
        authorization_code: credential.authorizationCode,
        nonce: credential.nonce,
        full_name: credential.fullName,
      },
    });
    const body = unwrap(result);
    await completeSignIn(body.data.token, body.data.user);
    return { cancelled: false, isNew: body.data.is_new, user: body.data.user };
  }

  async function signInWithGoogle(): Promise<SignInOutcome> {
    const idToken = await deps.providers.google();
    if (!idToken) return { cancelled: true };
    const result = await client.POST('/v1/auth/google', { body: { id_token: idToken } });
    const body = unwrap(result);
    await completeSignIn(body.data.token, body.data.user);
    return { cancelled: false, isNew: body.data.is_new, user: body.data.user };
  }

  // Sign out on this device only (R-12). Local state clears even when the
  // request fails offline; the server row then expires or the nightly sweep
  // removes it, so the phone never stays signed in by accident.
  async function signOut(): Promise<void> {
    try {
      await client.DELETE('/v1/auth/session');
    } catch {
      // Offline or the token was already invalid; nothing else to do.
    }
    await signOutLocally();
  }

  // DELETE /me, then local sign-out; returns purge_after (R-26).
  async function deleteAccount(): Promise<string> {
    const body = unwrap(await client.DELETE('/v1/me'));
    await signOutLocally();
    return body.data.purge_after;
  }

  // A gated action runs now when signed in; otherwise it waits for the next
  // successful sign-in and the sheet opens (R-21). Returns whether it ran.
  function requireSignIn(action: PendingAction): boolean {
    if (state.status === 'signedIn') {
      void action();
      return true;
    }
    pending = action;
    deps.openSignIn?.();
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
    cancelSignIn,
    useAuth(): AuthState {
      return useSyncExternalStore(subscribe, getState, getState);
    },
  };
}

export type AuthStore = ReturnType<typeof createAuthStore>;

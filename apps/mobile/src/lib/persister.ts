import type { Query } from '@tanstack/react-query';
import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';

import { storage, type KeyValueStore } from './storage';

// The last successful feed and list responses survive a relaunch and an
// airplane-mode start (discovery R-14). MMKV is synchronous, so the
// persister needs no queue: it writes on every cache change and reads once
// before the first render.
export const PERSIST_KEY = 'curb.query-cache';
// Older than this and the cached feed is not worth showing even offline.
export const MAX_AGE = 24 * 60 * 60 * 1000;
// Bump when a persisted response shape changes and an old snapshot should be
// dropped rather than hydrated.
export const CACHE_BUSTER = 'v1';

export function createMmkvPersister(store: KeyValueStore = storage): Persister {
  return {
    persistClient(client: PersistedClient) {
      try {
        store.set(PERSIST_KEY, JSON.stringify({ ...client, buster: CACHE_BUSTER }));
      } catch {
        // A cache that cannot be written is not a reason to lose the screen.
      }
    },
    restoreClient() {
      try {
        const raw = store.getString(PERSIST_KEY);
        if (!raw) return undefined;
        const restored = JSON.parse(raw) as PersistedClient;
        // A snapshot written by a build with different response shapes is
        // not worth hydrating into this one.
        return restored.buster === CACHE_BUSTER ? restored : undefined;
      } catch {
        return undefined;
      }
    },
    removeClient() {
      store.remove(PERSIST_KEY);
    },
  };
}

// R-14 asks for the last successful browse responses, and only those. MMKV
// is not encrypted, so account-scoped responses (the signed-in profile, the
// device row) stay in memory: writing them would leave the previous
// account's profile on disk after a sign-out. An allowlist rather than a
// denylist, so a resource added later is not persisted by accident.
const PERSISTED_RESOURCES = new Set([
  'feed',
  'events',
  'occurrences',
  'clubs',
  'sponsors',
  'users',
  'venues',
]);

export function shouldPersistQuery(query: Query): boolean {
  if (query.state.status !== 'success') return false;
  const [namespace, resource] = query.queryKey;
  return namespace === 'curb' && typeof resource === 'string' && PERSISTED_RESOURCES.has(resource);
}

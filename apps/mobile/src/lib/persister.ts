import type { PersistedClient, Persister } from '@tanstack/react-query-persist-client';

import { storage, type KeyValueStore } from './storage';

// The last successful feed and list responses survive a relaunch and an
// airplane-mode start (discovery R-14). MMKV is synchronous, so the
// persister needs no queue: it writes on every cache change and reads once
// before the first render.
export const PERSIST_KEY = 'curb.query-cache';
// Older than this and the cached feed is not worth showing even offline.
export const MAX_AGE = 24 * 60 * 60 * 1000;

export function createMmkvPersister(store: KeyValueStore = storage): Persister {
  return {
    persistClient(client: PersistedClient) {
      try {
        store.set(PERSIST_KEY, JSON.stringify(client));
      } catch {
        // A cache that cannot be written is not a reason to lose the screen.
      }
    },
    restoreClient() {
      try {
        const raw = store.getString(PERSIST_KEY);
        return raw ? (JSON.parse(raw) as PersistedClient) : undefined;
      } catch {
        return undefined;
      }
    },
    removeClient() {
      store.remove(PERSIST_KEY);
    },
  };
}

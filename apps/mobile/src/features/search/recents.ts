import type { QueryClient } from '@tanstack/react-query';

import { storage, type KeyValueStore } from '@/lib/storage';

// R-20: up to ten recents, shown when the field is empty. On the device
// only: a search history is the kind of thing that should not leave the
// phone, and nothing here is sent to the API.
export const RECENTS_STORAGE_KEY = 'curb.search-recents';
export const MAX_RECENTS = 10;

export function readRecents(store: KeyValueStore = storage): string[] {
  try {
    const raw = store.getString(RECENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === 'string').slice(0, MAX_RECENTS);
  } catch {
    return [];
  }
}

// Most recent first, no duplicates, and the oldest falls off the end. The
// comparison ignores case so "Corona" does not sit above "corona".
export function rememberSearch(query: string, store: KeyValueStore = storage): string[] {
  const text = query.trim();
  if (!text) return readRecents(store);

  const kept = readRecents(store).filter((row) => row.toLowerCase() !== text.toLowerCase());
  const next = [text, ...kept].slice(0, MAX_RECENTS);
  try {
    store.set(RECENTS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // A history that cannot be written is not a reason to lose the search.
  }
  return next;
}

export function clearRecents(store: KeyValueStore = storage): void {
  store.remove(RECENTS_STORAGE_KEY);
}

// The recents list is not the only copy of what someone searched for: the
// persisted query cache keys its rows by the query, which is what makes
// S05's offline state work (Screens S05, "cached only"). Clearing the
// history has to clear both, or the visible list empties while the same
// strings stay on disk for another day.
export function clearSearchHistory(client: QueryClient, store: KeyValueStore = storage): void {
  clearRecents(store);
  client.removeQueries({
    predicate: (query) => {
      const params = query.queryKey.at(-1);
      return typeof params === 'object' && params !== null && 'q' in params;
    },
  });
}

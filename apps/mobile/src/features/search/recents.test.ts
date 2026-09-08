import { describe, expect, it } from '@jest/globals';
import { QueryClient } from '@tanstack/react-query';

import {
  MAX_RECENTS,
  RECENTS_STORAGE_KEY,
  clearSearchHistory,
  readRecents,
  rememberSearch,
} from './recents';

import type { KeyValueStore } from '@/lib/storage';

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    set: (key, value) => void data.set(key, value),
    getString: (key) => data.get(key),
    remove: (key) => void data.delete(key),
  };
}

// docs/specs/discovery.md R-20 and AC-20.
describe('search recents', () => {
  it('R-20: keeps the most recent first', () => {
    const store = memoryStore();

    rememberSearch('corona', store);
    rememberSearch('lido', store);

    expect(readRecents(store)).toEqual(['lido', 'corona']);
  });

  it('R-20: keeps at most ten, dropping the oldest', () => {
    const store = memoryStore();

    for (let index = 0; index < MAX_RECENTS + 5; index += 1) {
      rememberSearch(`search ${index}`, store);
    }

    const recents = readRecents(store);
    expect(recents).toHaveLength(MAX_RECENTS);
    expect(recents[0]).toBe(`search ${MAX_RECENTS + 4}`);
    expect(recents).not.toContain('search 0');
  });

  it('searching the same thing again moves it up rather than repeating it', () => {
    const store = memoryStore();

    rememberSearch('corona', store);
    rememberSearch('lido', store);
    rememberSearch('Corona', store);

    // Case is not a different search, and the newer spelling is the one kept.
    expect(readRecents(store)).toEqual(['Corona', 'lido']);
  });

  it('an empty search is not a search', () => {
    const store = memoryStore();

    rememberSearch('corona', store);
    rememberSearch('   ', store);

    expect(readRecents(store)).toEqual(['corona']);
  });

  it('clearing the history clears the cached searches too, not just the list', () => {
    const store = memoryStore();
    // gcTime Infinity schedules no collection timer, so the run does not
    // sit waiting on one after the assertions.
    const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
    rememberSearch('corona', store);
    client.setQueryData(['curb', 'search', 'events', { q: 'corona' }], { data: [] });
    client.setQueryData(['curb', 'search', 'clubs', { q: 'corona' }], []);
    // A browse response is not a search and stays put.
    client.setQueryData(['curb', 'feed', { near: '33.62,-117.93' }], { sections: [] });

    clearSearchHistory(client, store);

    expect(readRecents(store)).toEqual([]);
    expect(client.getQueryData(['curb', 'search', 'events', { q: 'corona' }])).toBeUndefined();
    expect(client.getQueryData(['curb', 'search', 'clubs', { q: 'corona' }])).toBeUndefined();
    expect(client.getQueryData(['curb', 'feed', { near: '33.62,-117.93' }])).toBeDefined();
  });

  it('reads nothing rather than throwing on a corrupt entry', () => {
    const store = memoryStore();
    store.set(RECENTS_STORAGE_KEY, '{ not json');

    expect(readRecents(store)).toEqual([]);
  });

  it('ignores anything in the list that is not a search', () => {
    const store = memoryStore();
    store.set(RECENTS_STORAGE_KEY, JSON.stringify(['corona', 42, null, 'lido']));

    expect(readRecents(store)).toEqual(['corona', 'lido']);
  });
});

import { describe, expect, it } from '@jest/globals';
import type { PersistedClient } from '@tanstack/react-query-persist-client';

import { CACHE_BUSTER, PERSIST_KEY, createMmkvPersister, shouldPersistQuery } from './persister';
import type { KeyValueStore } from './storage';

function query(queryKey: unknown[], status = 'success') {
  return { queryKey, state: { status } } as unknown as Parameters<typeof shouldPersistQuery>[0];
}

function memoryStore(): KeyValueStore & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    set: (key, value) => void data.set(key, value),
    getString: (key) => data.get(key),
    remove: (key) => void data.delete(key),
  };
}

const client = {
  timestamp: 1,
  buster: CACHE_BUSTER,
  clientState: { mutations: [], queries: [] },
} as PersistedClient;

// docs/specs/discovery.md R-14: the last successful responses survive a
// relaunch, which is what makes airplane mode show saved results.
describe('the MMKV persister', () => {
  it('round-trips the cache', async () => {
    const store = memoryStore();
    const persister = createMmkvPersister(store);

    await persister.persistClient(client);
    expect(store.data.has(PERSIST_KEY)).toBe(true);
    // MMKV is synchronous, so the persister answers without a round trip;
    // await keeps the test agnostic about that.
    expect(await persister.restoreClient()).toEqual(client);

    await persister.removeClient();
    expect(await persister.restoreClient()).toBeUndefined();
  });

  it('returns nothing rather than throwing on a corrupt entry', async () => {
    const store = memoryStore();
    store.set(PERSIST_KEY, '{ not json');

    expect(await createMmkvPersister(store).restoreClient()).toBeUndefined();
  });

  it('drops a snapshot written by a build with other response shapes', async () => {
    const store = memoryStore();
    store.set(PERSIST_KEY, JSON.stringify({ ...client, buster: 'v0' }));

    expect(await createMmkvPersister(store).restoreClient()).toBeUndefined();
  });

  it('a cache that cannot be written does not take the screen down', async () => {
    const failing: KeyValueStore = {
      set: () => {
        throw new Error('disk full');
      },
      getString: () => undefined,
      remove: () => {},
    };

    expect(await createMmkvPersister(failing).persistClient(client)).toBeUndefined();
  });

  it('R-14: persists browse responses and leaves account data in memory', () => {
    expect(shouldPersistQuery(query(['curb', 'feed', { near: '33.62,-117.93' }]))).toBe(true);
    expect(shouldPersistQuery(query(['curb', 'events', 'lido-saturday']))).toBe(true);

    // MMKV is not encrypted, and a sign-out must not leave a profile on disk.
    expect(shouldPersistQuery(query(['curb', 'me']))).toBe(false);
    expect(shouldPersistQuery(query(['curb', 'devices', 'abc']))).toBe(false);
    // Anything named later is out until it is named here.
    expect(shouldPersistQuery(query(['curb', 'notifications']))).toBe(false);
  });

  it('R-14: an errored query is not what airplane mode should show', () => {
    expect(shouldPersistQuery(query(['curb', 'feed', {}], 'error'))).toBe(false);
  });
});

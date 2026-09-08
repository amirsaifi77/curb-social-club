import { describe, expect, it } from '@jest/globals';
import type { PersistedClient } from '@tanstack/react-query-persist-client';

import { PERSIST_KEY, createMmkvPersister } from './persister';
import type { KeyValueStore } from './storage';

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
  buster: '',
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
});

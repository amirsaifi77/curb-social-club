import { describe, expect, it } from '@jest/globals';


import { INTEREST_STORAGE_KEY } from './copy';
import {
  ONBOARDING_STORAGE_KEY,
  hasOnboarded,
  markOnboarded,
  readInterests,
  writeInterests,
} from './state';

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

// docs/specs/discovery.md R-4: interests live on the device only.
describe('onboarding state', () => {
  it('remembers that onboarding finished', () => {
    const store = memoryStore();
    expect(hasOnboarded(store)).toBe(false);
    markOnboarded(store);
    expect(hasOnboarded(store)).toBe(true);
    expect(store.data.get(ONBOARDING_STORAGE_KEY)).toBe('true');
  });

  it('R-4: stores interests on the device and reads them back', () => {
    const store = memoryStore();
    writeInterests(['jdm', 'euro'], store);

    expect(store.data.has(INTEREST_STORAGE_KEY)).toBe(true);
    expect(readInterests(store)).toEqual(['jdm', 'euro']);
  });

  it('drops anything that is not one of the interests, rather than throwing', () => {
    const store = memoryStore();
    store.set(INTEREST_STORAGE_KEY, JSON.stringify(['jdm', 'spaceship', 42]));
    expect(readInterests(store)).toEqual(['jdm']);

    store.set(INTEREST_STORAGE_KEY, 'not json');
    expect(readInterests(store)).toEqual([]);
  });
});

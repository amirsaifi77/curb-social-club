import { describe, expect, it } from '@jest/globals';

import { DEVICE_ID_KEY, getDeviceId } from './device-id';
import type { KeyValueStore } from './storage';

function fakeStore(): KeyValueStore & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    set: (k, v) => void map.set(k, v),
    getString: (k) => map.get(k),
    remove: (k) => void map.delete(k),
  };
}

describe('getDeviceId (R-24)', () => {
  it('generates a UUID once and persists it under curb.deviceId', () => {
    const store = fakeStore();
    let calls = 0;
    const generate = () => `uuid-${++calls}`;
    expect(getDeviceId(store, generate)).toBe('uuid-1');
    expect(getDeviceId(store, generate)).toBe('uuid-1');
    expect(store.map.get(DEVICE_ID_KEY)).toBe('uuid-1');
  });
});

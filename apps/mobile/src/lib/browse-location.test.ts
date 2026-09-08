import { describe, expect, it } from '@jest/globals';

import {
  BROWSE_STORAGE_KEY,
  DEFAULT_AREA,
  MAX_RADIUS_KM,
  clampRadius,
  nearParam,
  readBrowseArea,
  round,
  toBrowseArea,
  writeBrowseArea,
} from './browse-location';
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

// docs/specs/discovery.md R-1, R-2, R-3.
describe('browse location', () => {
  it('R-1: rounds to two decimals, about a kilometre', () => {
    expect(round(33.617234)).toBe(33.62);
    expect(round(-117.926999)).toBe(-117.93);
    expect(nearParam(toBrowseArea(33.617234, -117.926999, 'Near you'))).toBe('33.62,-117.93');
  });

  it('R-1: a precise pair cannot survive the constructor', () => {
    const area = toBrowseArea(33.6172349, -117.9269991, 'Near you', 'device');
    expect(area.lat).toBe(33.62);
    expect(area.lng).toBe(-117.93);
  });

  it('R-2: what is written is what is read back, still rounded', () => {
    const store = memoryStore();
    writeBrowseArea({ lat: 33.617234, lng: -117.926999, label: 'Newport' }, store);

    const stored = JSON.parse(store.data.get(BROWSE_STORAGE_KEY)!) as { lat: number; lng: number };
    expect(stored).toMatchObject({ lat: 33.62, lng: -117.93 });
    expect(readBrowseArea(store)).toMatchObject({ lat: 33.62, lng: -117.93, label: 'Newport' });
  });

  it('R-1: re-rounds a stored value a past build may have written precisely', () => {
    const store = memoryStore();
    store.set(BROWSE_STORAGE_KEY, JSON.stringify({ lat: 33.617234, lng: -117.926999, label: 'Old' }));

    expect(readBrowseArea(store)).toMatchObject({ lat: 33.62, lng: -117.93 });
  });

  it('returns null rather than throwing on a corrupt or impossible value', () => {
    const store = memoryStore();
    store.set(BROWSE_STORAGE_KEY, 'not json');
    expect(readBrowseArea(store)).toBeNull();

    store.set(BROWSE_STORAGE_KEY, JSON.stringify({ lat: 200, lng: 0, label: 'Nowhere' }));
    expect(readBrowseArea(store)).toBeNull();

    store.set(BROWSE_STORAGE_KEY, JSON.stringify({ lat: 33.6, label: 'Half' }));
    expect(readBrowseArea(store)).toBeNull();
  });

  it('R-3: the radius never exceeds the API maximum', () => {
    expect(clampRadius(32)).toBe(32);
    expect(clampRadius(80)).toBe(80);
    expect(clampRadius(500)).toBe(MAX_RADIUS_KM);
    expect(clampRadius(0)).toBe(1);
  });

  it('R-11: the default area is coastal Orange County, already rounded', () => {
    expect(DEFAULT_AREA).toMatchObject({ lat: 33.62, lng: -117.93 });
  });
});

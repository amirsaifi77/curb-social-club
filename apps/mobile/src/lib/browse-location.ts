import type { KeyValueStore } from './storage';
import { storage } from './storage';

// Discovery R-1: browse coordinates are rounded to two decimals, about a
// kilometre, and precise ones never leave the device. Every query goes
// through here so R-1 cannot regress in one screen.
export const BROWSE_PRECISION = 2;
export const BROWSE_STORAGE_KEY = 'curb.browse-area';
// R-3: 32 km normally, 80 km after the widen action, never above the API's 160.
export const DEFAULT_RADIUS_KM = 32;
export const WIDE_RADIUS_KM = 80;
export const MAX_RADIUS_KM = 160;
// R-11: coastal Orange County, used offline and when geocoding fails.
export const DEFAULT_AREA: BrowseArea = { lat: 33.62, lng: -117.93, label: 'Coastal Orange County' };

export type AreaSource = 'device' | 'city' | 'pin' | 'default';

export interface BrowseArea {
  lat: number;
  lng: number;
  label: string;
  source?: AreaSource;
}

export function round(value: number): number {
  return Math.round(value * 10 ** BROWSE_PRECISION) / 10 ** BROWSE_PRECISION;
}

// The only constructor: anything that becomes a BrowseArea is rounded here.
export function toBrowseArea(
  lat: number,
  lng: number,
  label: string,
  source: AreaSource = 'default',
): BrowseArea {
  return { lat: round(lat), lng: round(lng), label, source };
}

// What `near` looks like on the wire.
export function nearParam(area: BrowseArea): string {
  return `${round(area.lat)},${round(area.lng)}`;
}

export function clampRadius(km: number): number {
  return Math.min(Math.max(km, 1), MAX_RADIUS_KM);
}

export function isBrowseArea(value: unknown): value is BrowseArea {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.lat === 'number' &&
    typeof record.lng === 'number' &&
    Number.isFinite(record.lat) &&
    Number.isFinite(record.lng) &&
    Math.abs(record.lat) <= 90 &&
    Math.abs(record.lng) <= 180 &&
    typeof record.label === 'string'
  );
}

// R-2: the chosen area is persisted locally. A stored value is re-rounded
// on read, so a build that once wrote precise coordinates cannot leak them.
export function readBrowseArea(store: KeyValueStore = storage): BrowseArea | null {
  try {
    const raw = store.getString(BROWSE_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isBrowseArea(parsed)) return null;
    return toBrowseArea(parsed.lat, parsed.lng, parsed.label, parsed.source ?? 'default');
  } catch {
    return null;
  }
}

export function writeBrowseArea(area: BrowseArea, store: KeyValueStore = storage): void {
  const rounded = toBrowseArea(area.lat, area.lng, area.label, area.source);
  store.set(BROWSE_STORAGE_KEY, JSON.stringify(rounded));
}

export function clearBrowseArea(store: KeyValueStore = storage): void {
  store.remove(BROWSE_STORAGE_KEY);
}

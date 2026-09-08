import type { EventsListQuery, EventsMapQuery } from '@curb/api-client';

// discovery R-17 and the Copy table: four chips, and the same filters drive
// the pins and the sheet list from one request pair (AC-17).
export const THEME_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'jdm', label: 'JDM' },
  { value: 'euro', label: 'Euro' },
  { value: 'exotic', label: 'Exotic' },
  { value: 'classic', label: 'Classic' },
  { value: 'muscle', label: 'Muscle' },
  { value: 'truck', label: 'Trucks' },
  { value: 'ev', label: 'EV' },
  { value: 'bike', label: 'Bikes' },
] as const;

export type Theme = (typeof THEME_OPTIONS)[number]['value'];

export const DISTANCE_OPTIONS = [
  { miles: 10, km: 16, label: '10 miles' },
  { miles: 20, km: 32, label: '20 miles' },
  { miles: 50, km: 80, label: '50 miles' },
] as const;

export type DistanceMiles = (typeof DISTANCE_OPTIONS)[number]['miles'];

export type Sort = 'date' | 'distance';

export interface MapFilters {
  thisWeekend: boolean;
  theme: Theme;
  recurringOnly: boolean;
  distanceMiles: DistanceMiles;
}

export const DEFAULT_FILTERS: MapFilters = {
  thisWeekend: false,
  theme: 'all',
  recurringOnly: false,
  distanceMiles: 20,
};

// R-6's weekend: from now through the coming Sunday, in the reader's own
// day. The API decides sections; this is the chip's own window.
//
// `from` is the top of the current hour, not the instant. The window ends up
// in a query key, and an instant would make every render a different key: a
// new query, a new request, and the old one left in the cache. An hour of
// slack also keeps a meet that started recently in view, which is the same
// span the `now` pin style uses.
export function weekendWindow(now: Date = new Date()): { from: string; to: string } {
  const from = new Date(now);
  from.setMinutes(0, 0, 0);
  const end = new Date(now);
  end.setDate(end.getDate() + ((7 - end.getDay()) % 7));
  end.setHours(23, 59, 59, 999);
  return { from: from.toISOString(), to: end.toISOString() };
}

// The one place chip state becomes query parameters, so the pins and the
// list cannot drift apart (AC-17).
function shared(filters: MapFilters, now: Date) {
  const window = filters.thisWeekend ? weekendWindow(now) : null;
  return {
    ...(filters.theme === 'all' ? {} : { 'tags[]': [filters.theme] }),
    ...(filters.recurringOnly ? { recurring: true } : {}),
    ...(window ?? {}),
  };
}

export function mapQueryFor(bbox: string, filters: MapFilters, now = new Date()): EventsMapQuery {
  return { bbox, ...shared(filters, now) };
}

export function listQueryFor(
  bbox: string,
  filters: MapFilters,
  sort: Sort,
  near: string | null,
  now = new Date(),
): EventsListQuery {
  const distance = DISTANCE_OPTIONS.find((option) => option.miles === filters.distanceMiles);
  return {
    bbox,
    ...shared(filters, now),
    // R-18: Nearest needs somewhere to be near. Without one the sheet only
    // offers Soonest, so a distance sort is never sent without a `near`.
    ...(near ? { near, radius_km: distance?.km } : {}),
    sort: near ? sort : 'date',
  };
}

// R-18: the Nearest control is only offered when a `near` exists.
export function availableSorts(near: string | null): Sort[] {
  return near ? ['date', 'distance'] : ['date'];
}

const EARTH_RADIUS_KM = 6371;

// R-17: the same filters reach the pins and the list. `GET /events/map`
// takes a box, not a radius, so the Distance chip is applied to the pins
// here. Without it a 10 mile filter would shrink the list while every pin
// in the viewport stayed drawn, and the sheet's count would disagree with
// the rows under it.
export function withinDistance<T extends { lat: number; lng: number }>(
  pins: readonly T[],
  near: string | null,
  miles: DistanceMiles,
): T[] {
  const centre = parseNear(near);
  if (!centre) return [...pins];
  const km = DISTANCE_OPTIONS.find((option) => option.miles === miles)?.km;
  if (km === undefined) return [...pins];
  return pins.filter((pin) => haversineKm(centre, pin) <= km);
}

function parseNear(near: string | null): { lat: number; lng: number } | null {
  if (!near) return null;
  const [lat, lng] = near.split(',').map(Number);
  if (lat === undefined || lng === undefined) return null;
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

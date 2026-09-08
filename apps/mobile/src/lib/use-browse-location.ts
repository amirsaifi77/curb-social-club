import { api } from '@curb/api-client';
import { useCallback, useState, useSyncExternalStore } from 'react';

import { auth } from './auth';
import {
  DEFAULT_AREA,
  DEFAULT_RADIUS_KM,
  WIDE_RADIUS_KM,
  clampRadius,
  nearParam,
  readBrowseArea,
  writeBrowseArea,
  type BrowseArea,
} from './browse-location';
import { getDeviceId } from './device-id';

export interface BrowseLocation {
  area: BrowseArea;
  /** False until an area has been committed, so the area is the R-11 default. */
  chosen: boolean;
  radiusKm: number;
  near: string;
  setArea: (area: BrowseArea) => void;
  widen: () => void;
  widened: boolean;
}

// One area for the whole app, not one per hook call. S01 is a modal over an
// already mounted S02, so a screen that snapshotted the stored area in state
// would keep querying the old one after onboarding commits (AC-10). Every
// mounted reader subscribes to this store instead.
type Listener = () => void;

const listeners = new Set<Listener>();
let snapshot: BrowseArea | null = readBrowseArea();
let syncedNear: string | null = null;

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): BrowseArea | null {
  return snapshot;
}

// The one writer. Onboarding and the screens both go through here so the
// stored area, the readers, and the device row never disagree.
export function setBrowseArea(next: BrowseArea): void {
  writeBrowseArea(next);
  snapshot = readBrowseArea();
  for (const listener of listeners) listener();
  if (snapshot !== null) void syncDeviceHome(snapshot);
}

// Test seam: MMKV survives between tests in one file otherwise.
export function resetBrowseAreaCache(): void {
  snapshot = readBrowseArea();
  syncedNear = null;
  for (const listener of listeners) listener();
}

// The one place a browse area becomes query parameters (discovery R-1, R-2,
// R-3). Screens read `near` and `radiusKm` from here and never touch raw
// coordinates. The radius stays per screen: widening Home does not widen a
// map the person has not looked at.
export function useBrowseLocation(): BrowseLocation {
  const stored = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const area = stored ?? DEFAULT_AREA;

  const setArea = useCallback((next: BrowseArea) => {
    setBrowseArea(next);
    setRadiusKm(DEFAULT_RADIUS_KM);
  }, []);

  const widen = useCallback(() => setRadiusKm(clampRadius(WIDE_RADIUS_KM)), []);

  return {
    area,
    chosen: stored !== null,
    radiusKm,
    near: nearParam(area),
    setArea,
    widen,
    widened: radiusKm > DEFAULT_RADIUS_KM,
  };
}

// R-2: the rounded area follows the device row, so the API can seed a feed
// for a device that has not asked yet. Once per distinct area per launch,
// however many screens are mounted.
async function syncDeviceHome(area: BrowseArea): Promise<void> {
  const near = nearParam(area);
  if (near === syncedNear) return;
  syncedNear = near;
  try {
    await api.devices.update(auth.client, getDeviceId(), {
      home_location: { lat: area.lat, lng: area.lng },
    });
  } catch {
    // Offline, or the device row is not there yet; let the next change retry.
    syncedNear = null;
  }
}

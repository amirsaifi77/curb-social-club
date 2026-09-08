import { api } from '@curb/api-client';
import { useCallback, useEffect, useState } from 'react';

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
  /** Null until onboarding has picked an area, so the feed can wait. */
  chosen: boolean;
  radiusKm: number;
  near: string;
  setArea: (area: BrowseArea) => void;
  widen: () => void;
  widened: boolean;
}

// The one place a browse area becomes query parameters (discovery R-1, R-2,
// R-3). Screens read `near` and `radiusKm` from here and never touch raw
// coordinates.
export function useBrowseLocation(): BrowseLocation {
  const [stored, setStored] = useState<BrowseArea | null>(() => readBrowseArea());
  const [radiusKm, setRadiusKm] = useState(DEFAULT_RADIUS_KM);
  const area = stored ?? DEFAULT_AREA;

  const setArea = useCallback((next: BrowseArea) => {
    writeBrowseArea(next);
    setStored(readBrowseArea());
    setRadiusKm(DEFAULT_RADIUS_KM);
  }, []);

  const widen = useCallback(() => setRadiusKm(clampRadius(WIDE_RADIUS_KM)), []);

  // R-2: the rounded area follows the device row, so the API can seed a
  // feed for a device that has not asked yet.
  useEffect(() => {
    if (stored === null) return;
    void syncDeviceHome(stored);
  }, [stored]);

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

async function syncDeviceHome(area: BrowseArea): Promise<void> {
  try {
    await api.devices.update(auth.client, getDeviceId(), {
      home_location: { lat: area.lat, lng: area.lng },
    });
  } catch {
    // Offline, or the device row is not there yet; the next change retries.
  }
}

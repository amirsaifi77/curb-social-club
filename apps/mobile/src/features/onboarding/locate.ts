import * as Location from 'expo-location';

import { DEFAULT_AREA, toBrowseArea, type BrowseArea } from '@/lib/browse-location';

export type LocateOutcome =
  | { status: 'ok'; area: BrowseArea }
  | { status: 'denied' }
  | { status: 'failed' };

// R-10: reduced accuracy, asked only from card two and only after the
// in-app explainer. The coordinates are rounded before they leave here, so
// nothing downstream ever holds a precise fix (R-1).
export async function locateDevice(): Promise<LocateOutcome> {
  try {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) return { status: 'denied' };

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Lowest,
    });
    return {
      status: 'ok',
      area: toBrowseArea(
        position.coords.latitude,
        position.coords.longitude,
        'Near you',
        'device',
      ),
    };
  } catch {
    return { status: 'failed' };
  }
}

export type GeocodeOutcome =
  | { status: 'ok'; area: BrowseArea }
  | { status: 'not_found' }
  | { status: 'failed' };

// R-11: city search through the on-device geocoder. A failure is a message,
// not a dead end: the caller offers the pin instead. "We could not find that
// city" and "the geocoder could not be reached" are different messages, so
// they are different outcomes here.
export async function geocodeCity(query: string): Promise<GeocodeOutcome> {
  const text = query.trim();
  if (!text) return { status: 'not_found' };

  try {
    const [match] = await Location.geocodeAsync(text);
    if (!match) return { status: 'not_found' };
    return { status: 'ok', area: toBrowseArea(match.latitude, match.longitude, text, 'city') };
  } catch {
    return { status: 'failed' };
  }
}

// R-11: offline or nothing chosen at all still lands somewhere real.
export function defaultArea(): BrowseArea {
  return { ...DEFAULT_AREA, source: 'default' };
}

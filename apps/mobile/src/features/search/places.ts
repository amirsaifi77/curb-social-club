import * as Location from 'expo-location';

import { toBrowseArea, type BrowseArea } from '@/lib/browse-location';

// R-20: Places comes from the on-device geocoder, not the API. No request
// leaves the phone for this group, and the coordinates it returns go
// through the same rounding boundary as every other browse coordinate
// (R-1), because picking a place moves the map.
export const MAX_PLACES = 5;

export interface Place {
  id: string;
  label: string;
  area: BrowseArea;
}

// "No place matched" and "the geocoder could not be reached" are different
// facts, the same distinction R-11 draws on S01 and R-17 on S03. Collapsing
// them would show an empty Places group offline as though the place did not
// exist.
export type PlacesOutcome =
  | { status: 'ok'; places: Place[] }
  | { status: 'unavailable'; places: [] };

export async function searchPlaces(query: string): Promise<PlacesOutcome> {
  const text = query.trim();
  if (!text) return { status: 'ok', places: [] };

  try {
    const matches = await Location.geocodeAsync(text);
    return {
      status: 'ok',
      places: matches.slice(0, MAX_PLACES).map((match, index) => ({
        id: `${text}-${index}`,
        label: text,
        area: toBrowseArea(match.latitude, match.longitude, text, 'city'),
      })),
    };
  } catch {
    // The other groups still answer, so this is not a failed search: it is
    // the same "saved results only" the API groups report when they cannot
    // be reached.
    return { status: 'unavailable', places: [] };
  }
}

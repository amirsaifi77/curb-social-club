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

export async function searchPlaces(query: string): Promise<Place[]> {
  const text = query.trim();
  if (!text) return [];

  try {
    const matches = await Location.geocodeAsync(text);
    return matches.slice(0, MAX_PLACES).map((match, index) => ({
      id: `${text}-${index}`,
      label: text,
      area: toBrowseArea(match.latitude, match.longitude, text, 'city'),
    }));
  } catch {
    // Offline, or the geocoder is unavailable. The other groups still
    // answer, so a missing Places group is not a failed search.
    return [];
  }
}

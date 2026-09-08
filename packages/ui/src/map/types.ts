// The pin payload `GET /events/map` returns. Declared here rather than
// imported from @curb/types so the map logic stays usable by a test or a
// tool that has no generated types, and so web and mobile agree on it.
export interface MapPinInput {
  id: string;
  event_id: string;
  slug: string;
  lat: number;
  lng: number;
  starts_at: string;
  title: string;
  going_count: number;
  recurring: boolean;
}

// west, south, east, north, the order `GET /events/map` expects.
export interface Bbox {
  west: number;
  south: number;
  east: number;
  north: number;
}

// What a map draws: either one pin or a count.
export type MapFeature =
  | { type: 'pin'; id: string; lat: number; lng: number; pin: MapPinInput }
  | { type: 'cluster'; id: number; lat: number; lng: number; count: number };

// The region shape react-native-maps uses. Plain numbers, so this file
// stays free of native imports.
export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

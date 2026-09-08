// web.md R-12 and R-13: the launch list, two rings. A city page stays live
// with its empty copy rather than 404ing, so the URL keeps its rank while
// the ring fills up (web.md Risks).

export interface City {
  slug: string;
  name: string;
  /** Already rounded to two decimals, which is all the API is ever sent. */
  lat: number;
  lng: number;
}

export const CITIES: readonly City[] = [
  { slug: 'newport-beach', name: 'Newport Beach', lat: 33.62, lng: -117.93 },
  { slug: 'corona-del-mar', name: 'Corona del Mar', lat: 33.6, lng: -117.87 },
  { slug: 'laguna-beach', name: 'Laguna Beach', lat: 33.54, lng: -117.78 },
  { slug: 'dana-point', name: 'Dana Point', lat: 33.47, lng: -117.7 },
  { slug: 'san-clemente', name: 'San Clemente', lat: 33.43, lng: -117.62 },
  { slug: 'rancho-cucamonga', name: 'Rancho Cucamonga', lat: 34.11, lng: -117.59 },
  { slug: 'fontana', name: 'Fontana', lat: 34.09, lng: -117.44 },
] as const;

export function findCity(slug: string | null | undefined): City | null {
  if (!slug) return null;
  return CITIES.find((city) => city.slug === slug) ?? null;
}

export function cityNear(city: City): string {
  return `${city.lat.toFixed(2)},${city.lng.toFixed(2)}`;
}

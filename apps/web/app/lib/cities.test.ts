import { describe, expect, it } from 'vitest';

import { CITIES, cityNear, findCity } from './cities';

// web.md R-12: the seven launch slugs, and coordinates that are already
// rounded, so no page can send the API more precision than it should have.
describe('cities', () => {
  it('holds exactly the seven slugs R-12 names', () => {
    expect(CITIES.map((city) => city.slug)).toEqual([
      'newport-beach',
      'corona-del-mar',
      'laguna-beach',
      'dana-point',
      'san-clemente',
      'rancho-cucamonga',
      'fontana',
    ]);
  });

  it('stores coordinates at two decimals, the precision the API is given', () => {
    for (const city of CITIES) {
      expect(city.lat).toBe(Number(city.lat.toFixed(2)));
      expect(city.lng).toBe(Number(city.lng.toFixed(2)));
    }
  });

  it('finds a city by slug and nothing by a slug nobody has', () => {
    expect(findCity('laguna-beach')?.name).toBe('Laguna Beach');
    expect(findCity('nowhere')).toBeNull();
    expect(findCity(null)).toBeNull();
  });

  it('formats the near parameter the API takes', () => {
    expect(cityNear(CITIES[0]!)).toBe('33.62,-117.93');
  });
});

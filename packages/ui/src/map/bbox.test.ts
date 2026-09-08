import { describe, expect, it } from 'vitest';

import { bboxFromRegion, movedEnough, regionFromBbox } from './bbox';

// The web map tracks a bounding box, which is what the API takes, and
// movedEnough compares regions, which is what a native map reports. One of
// the two has to convert, and getting it wrong makes the map refetch on
// every pan or never refetch at all.
describe('regionFromBbox', () => {
  it('is the inverse of bboxFromRegion', () => {
    const region = { latitude: 33.62, longitude: -117.93, latitudeDelta: 0.2, longitudeDelta: 0.4 };

    const back = regionFromBbox(bboxFromRegion(region));

    expect(back.latitude).toBeCloseTo(region.latitude, 10);
    expect(back.longitude).toBeCloseTo(region.longitude, 10);
    expect(back.latitudeDelta).toBeCloseTo(region.latitudeDelta, 10);
    expect(back.longitudeDelta).toBeCloseTo(region.longitudeDelta, 10);
  });

  it('gives movedEnough two regions it can actually compare', () => {
    const first = regionFromBbox({ west: -118, south: 33.5, east: -117.8, north: 33.7 });
    const same = regionFromBbox({ west: -118, south: 33.5, east: -117.8, north: 33.7 });
    const far = regionFromBbox({ west: -117, south: 34.5, east: -116.8, north: 34.7 });

    expect(movedEnough(first, same)).toBe(false);
    expect(movedEnough(first, far)).toBe(true);
  });
});

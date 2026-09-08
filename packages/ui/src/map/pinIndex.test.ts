import { describe, expect, it } from 'vitest';

import {
  TILE_SIZE,
  bboxFromRegion,
  bboxParam,
  isRequestableBbox,
  movedEnough,
  spanForZoom,
  zoomFromRegion,
} from './bbox';
import { CLUSTER_MAX_ZOOM, createPinIndex } from './pinIndex';
import type { Bbox, MapPinInput } from './types';

// Web Mercator: 360 degrees of longitude span TILE_SIZE * 2^zoom pixels, so
// this is how many degrees a screen distance is worth at a given zoom. The
// AC is written in pixels, so the fixture is too.
function degreesForPixels(pixels: number, zoom: number): number {
  return (pixels * 360) / (TILE_SIZE * 2 ** zoom);
}

function pin(overrides: Partial<MapPinInput> = {}): MapPinInput {
  return {
    id: 'a',
    event_id: 'e-a',
    slug: 'lido-saturday',
    lat: 33.62,
    lng: -117.93,
    starts_at: '2026-10-24T14:30:00Z',
    title: 'Lido Saturday',
    going_count: 0,
    recurring: false,
    ...overrides,
  };
}

const AROUND_LIDO: Bbox = { west: -118.5, south: 33.2, east: -117.3, north: 34.0 };

// docs/specs/discovery.md AC-14, R-15, R-16.
describe('the pin index', () => {
  it('AC-14: two pins 30 px apart at zoom 12 are one cluster of two', () => {
    const index = createPinIndex([
      pin({ id: 'a' }),
      pin({ id: 'b', lng: -117.93 + degreesForPixels(30, 12) }),
    ]);

    const features = index.featuresIn(AROUND_LIDO, 12);

    expect(features).toHaveLength(1);
    expect(features[0]).toMatchObject({ type: 'cluster', count: 2 });
  });

  it('AC-14: the same pins are two pins at zoom 15', () => {
    const index = createPinIndex([
      pin({ id: 'a' }),
      pin({ id: 'b', lng: -117.93 + degreesForPixels(30, 12) }),
    ]);

    const features = index.featuresIn(AROUND_LIDO, 15);

    expect(features.map((feature) => feature.type)).toEqual(['pin', 'pin']);
    expect(features.map((feature) => feature.id).sort()).toEqual(['a', 'b']);
  });

  it('AC-14: pins 400 px apart at zoom 15 are never one cluster there', () => {
    const index = createPinIndex([
      pin({ id: 'a' }),
      pin({ id: 'b', lng: -117.93 + degreesForPixels(400, 15) }),
    ]);

    expect(index.featuresIn(AROUND_LIDO, 15).map((feature) => feature.type)).toEqual([
      'pin',
      'pin',
    ]);
  });

  it('AC-14: a cluster tap returns an expansion zoom past the zoom it clustered at', () => {
    const index = createPinIndex([
      pin({ id: 'a' }),
      pin({ id: 'b', lng: -117.93 + degreesForPixels(30, 12) }),
    ]);

    const [cluster] = index.featuresIn(AROUND_LIDO, 12);
    if (cluster.type !== 'cluster') throw new Error('expected a cluster at zoom 12');

    expect(index.expansionZoom(cluster.id)).toBeGreaterThan(12);
  });

  it('R-16: an id the index does not hold does not become a degenerate region', () => {
    const index = createPinIndex([pin({ id: 'a' })]);

    // Supercluster answers an unknown id with a zoom past the maximum, and
    // a span of a millionth of a degree is not somewhere to fly.
    expect(index.expansionZoom(999_999)).toBeLessThanOrEqual(CLUSTER_MAX_ZOOM + 1);
  });

  it('draws nothing for a zoom that is not a number', () => {
    const index = createPinIndex([pin({ id: 'a' })]);

    expect(index.featuresIn(AROUND_LIDO, Number.NaN)).toEqual([]);
  });

  it('R-16: a cluster can name the pins inside it, for the sheet', () => {
    const index = createPinIndex([
      pin({ id: 'a' }),
      pin({ id: 'b', lng: -117.93 + degreesForPixels(30, 12) }),
    ]);

    const [cluster] = index.featuresIn(AROUND_LIDO, 12);
    if (cluster.type !== 'cluster') throw new Error('expected a cluster at zoom 12');

    expect(index.leaves(cluster.id).map((leaf) => leaf.id).sort()).toEqual(['a', 'b']);
  });

  it('R-15: stops clustering above the max zoom rather than throwing', () => {
    const index = createPinIndex([pin({ id: 'a' }), pin({ id: 'b', lat: 33.6201 })]);

    expect(index.featuresIn(AROUND_LIDO, CLUSTER_MAX_ZOOM + 4)).toHaveLength(2);
  });

  it('keeps a pin outside the box out of the viewport', () => {
    const index = createPinIndex([pin({ id: 'a' }), pin({ id: 'far', lat: 40.7, lng: -74 })]);

    expect(index.featuresIn(AROUND_LIDO, 12).map((feature) => feature.id)).toEqual(['a']);
  });

  it('draws nothing, and does not throw, for an empty response', () => {
    expect(createPinIndex([]).featuresIn(AROUND_LIDO, 12)).toEqual([]);
  });

  it('clusters pins that share a coordinate exactly', () => {
    const index = createPinIndex([pin({ id: 'a' }), pin({ id: 'b' })]);

    expect(index.featuresIn(AROUND_LIDO, 12)).toMatchObject([{ type: 'cluster', count: 2 }]);
  });
});

describe('bbox helpers', () => {
  it('turns a region into the w,s,e,n the API asks for', () => {
    const bbox = bboxFromRegion({
      latitude: 33.62,
      longitude: -117.93,
      latitudeDelta: 0.2,
      longitudeDelta: 0.4,
    });

    expect(bboxParam(bbox)).toBe('-118.13,33.52,-117.73,33.72');
  });

  it('refuses a box that has run off the edge of the world', () => {
    // Across the antimeridian, where west stops being less than east.
    expect(isRequestableBbox({ west: 178, south: 33, east: -178, north: 34 })).toBe(false);
    // Past a pole, and past 180 degrees of longitude.
    expect(isRequestableBbox({ west: -118, south: 88, east: -117, north: 92 })).toBe(false);
    expect(isRequestableBbox({ west: 178, south: 33, east: 182, north: 34 })).toBe(false);
    // A map that has collapsed to nothing is not a viewport.
    expect(isRequestableBbox({ west: -118, south: 33, east: -118, north: 34 })).toBe(false);
  });

  it('refuses a box the API would answer with a 400', () => {
    expect(isRequestableBbox({ west: -118, south: 33, east: -117, north: 34 })).toBe(true);
    expect(isRequestableBbox({ west: -122, south: 33, east: -117, north: 34 })).toBe(true);
    expect(isRequestableBbox({ west: -124, south: 33, east: -117, north: 34 })).toBe(false);
    expect(isRequestableBbox({ west: -118, south: 28, east: -117, north: 34 })).toBe(false);
  });

  it('reads a zoom level off a region and its width in pixels', () => {
    // A 390 pt wide phone showing 0.4 degrees of longitude.
    const zoom = zoomFromRegion(
      { latitude: 33.62, longitude: -117.93, latitudeDelta: 0.2, longitudeDelta: 0.4 },
      390,
    );

    expect(zoom).toBeCloseTo(Math.log2((360 * (390 / TILE_SIZE)) / 0.4), 6);
  });

  it('R-16: spanForZoom is the exact inverse of zoomFromRegion', () => {
    // The two disagreeing is a cluster tap that overshoots: on a phone by
    // about half a level, on an iPad in landscape by more than two.
    for (const width of [390, 430, 1194]) {
      for (const span of [0.4, 0.05, 3]) {
        const region = { latitude: 33.62, longitude: -117.93, latitudeDelta: span / 2, longitudeDelta: span };
        expect(spanForZoom(zoomFromRegion(region, width), width)).toBeCloseTo(span, 10);
      }
    }
  });

  it('R-15: the pill waits for a fifth of the viewport or a whole zoom level', () => {
    const fetched = {
      latitude: 33.62,
      longitude: -117.93,
      latitudeDelta: 0.2,
      longitudeDelta: 0.4,
    };

    // A sixth of a viewport across is not worth a request.
    expect(movedEnough(fetched, { ...fetched, longitude: -117.865 })).toBe(false);
    // Half a viewport across.
    expect(movedEnough(fetched, { ...fetched, longitude: -117.73 })).toBe(true);
    // A tenth of a viewport north is still not worth a request.
    expect(movedEnough(fetched, { ...fetched, latitude: 33.64 })).toBe(false);
    // One zoom level in, without moving the centre at all.
    expect(
      movedEnough(fetched, { ...fetched, latitudeDelta: 0.1, longitudeDelta: 0.2 }),
    ).toBe(true);
  });
});

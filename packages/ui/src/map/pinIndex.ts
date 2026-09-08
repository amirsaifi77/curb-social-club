import Supercluster from 'supercluster';

import { TILE_SIZE, isRequestableBbox } from './bbox';
import type { Bbox, MapFeature, MapPinInput } from './types';

// discovery.md R-15: client clustering, radius 56 px, max zoom 16. Above
// the max zoom supercluster stops grouping, so the last zoom levels always
// show individual pins.
export const CLUSTER_RADIUS = 56;
export const CLUSTER_MAX_ZOOM = 16;

export interface PinIndex {
  /** What to draw for a viewport: a mix of pins and counts. */
  featuresIn(bbox: Bbox, zoom: number): MapFeature[];
  /** R-16: the zoom a cluster tap should fly to. */
  expansionZoom(clusterId: number): number;
  /** The pins inside a cluster, for the sheet. */
  leaves(clusterId: number, limit?: number): MapPinInput[];
  /** Every pin the index holds, soonest first, for the sheet's list. */
  all(): MapPinInput[];
}

type PinProperties = { pin: MapPinInput };

export function createPinIndex(pins: readonly MapPinInput[]): PinIndex {
  const index = new Supercluster<PinProperties>({
    radius: CLUSTER_RADIUS,
    maxZoom: CLUSTER_MAX_ZOOM,
    // Supercluster measures `radius` against `extent`, which defaults to
    // 512. `zoomFromRegion` reads zoom off a 256 px tile, so leaving the
    // default would make "56 px" mean 28 on screen and pins would stay
    // apart where the spec says they cluster.
    extent: TILE_SIZE,
  });

  index.load(
    pins.map((pin) => ({
      type: 'Feature' as const,
      properties: { pin },
      geometry: { type: 'Point' as const, coordinates: [pin.lng, pin.lat] },
    })),
  );

  const sorted = [...pins].sort((a, b) => a.starts_at.localeCompare(b.starts_at));

  return {
    featuresIn(bbox, zoom) {
      // Supercluster takes whole zoom levels; a fractional one would drop
      // clusters the map is showing between two levels.
      const level = Math.min(Math.max(Math.round(zoom), 0), CLUSTER_MAX_ZOOM + 1);
      return index
        .getClusters([bbox.west, bbox.south, bbox.east, bbox.north], level)
        .map((feature): MapFeature => {
          const [lng, lat] = feature.geometry.coordinates;
          const properties = feature.properties;
          if ('cluster' in properties && properties.cluster) {
            return {
              type: 'cluster',
              id: properties.cluster_id,
              lat,
              lng,
              count: properties.point_count,
            };
          }
          const { pin } = properties as PinProperties;
          return { type: 'pin', id: pin.id, lat, lng, pin };
        });
    },

    expansionZoom(clusterId) {
      return index.getClusterExpansionZoom(clusterId);
    },

    leaves(clusterId, limit = Infinity) {
      return index
        .getLeaves(clusterId, limit)
        .map((feature) => (feature.properties as PinProperties).pin);
    },

    all() {
      return sorted;
    },
  };
}

export { isRequestableBbox };

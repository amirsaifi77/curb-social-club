import type { Bbox, Region } from './types';

// The API rejects a box wider than 5 degrees (GET /events/map).
export const MAX_BBOX_DEGREES = 5;
// Web Mercator: one tile is 256 px, and each zoom level doubles the world.
export const TILE_SIZE = 256;

export function bboxFromRegion(region: Region): Bbox {
  return {
    west: region.longitude - region.longitudeDelta / 2,
    south: region.latitude - region.latitudeDelta / 2,
    east: region.longitude + region.longitudeDelta / 2,
    north: region.latitude + region.latitudeDelta / 2,
  };
}

// `bbox=w,s,e,n`, rounded to six decimals so an idle map does not produce a
// new cache key every frame. This is a viewport, not a person's location:
// the R-1 rounding rule is about `near`, which never comes from here.
export function bboxParam(bbox: Bbox): string {
  return [bbox.west, bbox.south, bbox.east, bbox.north]
    .map((value) => Number(value.toFixed(6)))
    .join(',');
}

export function bboxWidth(bbox: Bbox): number {
  return Math.abs(bbox.east - bbox.west);
}

export function bboxHeight(bbox: Bbox): number {
  return Math.abs(bbox.north - bbox.south);
}

// A box the API would refuse is not worth sending. The caller shows the
// zoom-in notice instead of spending a request on a 400.
export function isRequestableBbox(bbox: Bbox): boolean {
  return bboxWidth(bbox) <= MAX_BBOX_DEGREES && bboxHeight(bbox) <= MAX_BBOX_DEGREES;
}

// Supercluster works in zoom levels, so a region has to become one. Width
// in pixels is the map's own width; 360 degrees spans TILE_SIZE * 2^zoom.
export function zoomFromRegion(region: Region, viewportWidth: number): number {
  const span = Math.max(region.longitudeDelta, Number.EPSILON);
  return Math.log2((360 * (viewportWidth / TILE_SIZE)) / span);
}

// R-15: the "search this area" pill appears once the map has moved more
// than 20 percent of the viewport or a whole zoom level from the box the
// pins came from.
export const MOVE_FRACTION = 0.2;

export function movedEnough(fetched: Region, current: Region): boolean {
  const zoomChange = Math.abs(
    Math.log2(fetched.longitudeDelta / Math.max(current.longitudeDelta, Number.EPSILON)),
  );
  if (zoomChange >= 1) return true;

  const movedX = Math.abs(current.longitude - fetched.longitude) / current.longitudeDelta;
  const movedY = Math.abs(current.latitude - fetched.latitude) / current.latitudeDelta;
  return Math.max(movedX, movedY) > MOVE_FRACTION;
}

import { describe, expect, it } from '@jest/globals';

import {
  DEFAULT_FILTERS,
  availableSorts,
  listQueryFor,
  mapQueryFor,
  weekendWindow,
} from './filters';

const BBOX = '-118.13,33.52,-117.73,33.72';
// A Wednesday, so the weekend window has somewhere to run to.
const WEDNESDAY = new Date('2026-10-21T17:00:00Z');

// docs/specs/discovery.md R-17, R-18, AC-17.
describe('map filters', () => {
  it('AC-17: JDM plus Recurring only produce one pair carrying both', () => {
    const filters = { ...DEFAULT_FILTERS, theme: 'jdm' as const, recurringOnly: true };

    const pins = mapQueryFor(BBOX, filters, WEDNESDAY);
    const list = listQueryFor(BBOX, filters, 'date', null, WEDNESDAY);

    expect(pins).toEqual({ bbox: BBOX, 'tags[]': ['jdm'], recurring: true });
    expect(list).toMatchObject({ bbox: BBOX, 'tags[]': ['jdm'], recurring: true });
  });

  it('R-17: the pins and the sheet always carry the same filters', () => {
    const filters = { ...DEFAULT_FILTERS, thisWeekend: true, theme: 'euro' as const };

    const pins = mapQueryFor(BBOX, filters, WEDNESDAY);
    const list = listQueryFor(BBOX, filters, 'date', '33.62,-117.93', WEDNESDAY);

    for (const key of ['tags[]', 'recurring', 'from', 'to'] as const) {
      expect(list[key]).toEqual(pins[key]);
    }
  });

  it('All and Recurring off send nothing rather than a wildcard', () => {
    expect(mapQueryFor(BBOX, DEFAULT_FILTERS, WEDNESDAY)).toEqual({ bbox: BBOX });
  });

  it('the weekend chip runs from now through the coming Sunday', () => {
    const { from, to } = weekendWindow(WEDNESDAY);

    expect(from).toBe(WEDNESDAY.toISOString());
    expect(new Date(to).getDay()).toBe(0);
    expect(new Date(to).getTime()).toBeGreaterThan(WEDNESDAY.getTime());
  });

  it('R-15: the window holds still within the hour, so it can be a cache key', () => {
    // A window read off the instant would make every render a new query,
    // and a map left on screen would refetch itself.
    expect(weekendWindow(new Date('2026-10-21T17:00:00.123Z'))).toEqual(
      weekendWindow(new Date('2026-10-21T17:44:59.999Z')),
    );
    expect(weekendWindow(new Date('2026-10-21T17:00:00.123Z')).from).toBe(
      '2026-10-21T17:00:00.000Z',
    );
  });

  it('R-18: Nearest is offered, and sent, only when there is a near', () => {
    expect(availableSorts(null)).toEqual(['date']);
    expect(availableSorts('33.62,-117.93')).toEqual(['date', 'distance']);

    // Asking for distance without a near would be a 400, so it degrades.
    expect(listQueryFor(BBOX, DEFAULT_FILTERS, 'distance', null, WEDNESDAY)).toMatchObject({
      sort: 'date',
    });
    expect(listQueryFor(BBOX, DEFAULT_FILTERS, 'distance', '33.62,-117.93', WEDNESDAY)).toMatchObject(
      { sort: 'distance', near: '33.62,-117.93', radius_km: 32 },
    );
  });

  it('the distance chip picks the radius the list is scored against', () => {
    const near = '33.62,-117.93';
    const ten = listQueryFor(BBOX, { ...DEFAULT_FILTERS, distanceMiles: 10 }, 'distance', near);
    const fifty = listQueryFor(BBOX, { ...DEFAULT_FILTERS, distanceMiles: 50 }, 'distance', near);

    expect(ten.radius_km).toBe(16);
    expect(fifty.radius_km).toBe(80);
  });
});

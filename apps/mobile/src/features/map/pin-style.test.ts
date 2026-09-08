import type { MapPinInput } from '@curb/ui';
import { describe, expect, it } from '@jest/globals';

import { NOW_WINDOW_MS, PIN_GLYPH, PIN_ROLE, pinStyle } from './pin-style';

function pin(overrides: Partial<MapPinInput> = {}): MapPinInput {
  return {
    id: 'o1',
    event_id: 'e1',
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

const NOON = new Date('2026-10-24T12:00:00Z');

// brand/brand-guide.md section 4 and docs/gaps-and-open-questions.md item 30.
describe('pinStyle', () => {
  it('draws a meet that has started and not run out as happening now', () => {
    expect(pinStyle(pin({ starts_at: '2026-10-24T11:00:00Z' }), NOON)).toBe('now');
    expect(pinStyle(pin({ starts_at: '2026-10-24T12:00:00Z' }), NOON)).toBe('now');
  });

  it('leaves a meet that has finished off the map rather than drawing past', () => {
    const finished = new Date(NOON.getTime() - NOW_WINDOW_MS - 1000).toISOString();

    expect(pinStyle(pin({ starts_at: finished }), NOON)).toBeNull();
  });

  it('draws later today as today, even for a series', () => {
    expect(pinStyle(pin({ starts_at: '2026-10-24T18:00:00Z' }), NOON)).toBe('today');
    expect(pinStyle(pin({ starts_at: '2026-10-24T18:00:00Z', recurring: true }), NOON)).toBe(
      'today',
    );
  });

  it('separates a series from a one-off once it is past today', () => {
    expect(pinStyle(pin({ starts_at: '2026-10-31T14:30:00Z' }), NOON)).toBe('upcoming');
    expect(pinStyle(pin({ starts_at: '2026-10-31T14:30:00Z', recurring: true }), NOON)).toBe(
      'recurring',
    );
  });

  it('never draws a pin whose start cannot be read', () => {
    expect(pinStyle(pin({ starts_at: 'not a date' }), NOON)).toBeNull();
  });

  it('maps every style to a pin role and a glyph from the brand guide', () => {
    expect(PIN_ROLE).toEqual({
      now: 'pinNow',
      today: 'pinToday',
      upcoming: 'pinUpcoming',
      recurring: 'pinRecurring',
    });
    // A series is the one that is not a car.
    expect(PIN_GLYPH).toEqual({
      now: 'car.fill',
      today: 'car.fill',
      upcoming: 'car.fill',
      recurring: 'repeat',
    });
  });
});

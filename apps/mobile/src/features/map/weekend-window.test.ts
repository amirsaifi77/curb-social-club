import { describe, expect, it } from '@jest/globals';

import { weekendWindow } from './filters';

// The suite runs at TZ=UTC (jest.config.js), so the window's dependence on
// the reader's own day is asserted here by moving the clock rather than the
// zone: the boundaries a wrong implementation trips over are the day of the
// week, the end of a month, the end of a year, and a Sunday.
function endOf(iso: string) {
  return weekendWindow(new Date(iso)).to;
}

describe('the weekend window', () => {
  it('runs to the coming Sunday from any day of the week', () => {
    // Monday 2026-10-19 through Sunday 2026-10-25.
    for (const day of ['19', '20', '21', '22', '23', '24', '25']) {
      expect(endOf(`2026-10-${day}T17:00:00Z`)).toBe('2026-10-25T23:59:59.999Z');
    }
  });

  it('ends on the same day when it is already Sunday', () => {
    expect(endOf('2026-10-25T23:00:00Z')).toBe('2026-10-25T23:59:59.999Z');
  });

  it('crosses the end of a month', () => {
    // Thursday 2026-10-29 reaches into November.
    expect(endOf('2026-10-29T17:00:00Z')).toBe('2026-11-01T23:59:59.999Z');
  });

  it('crosses the end of a year', () => {
    // Wednesday 2026-12-30 reaches into January.
    expect(endOf('2026-12-30T17:00:00Z')).toBe('2027-01-03T23:59:59.999Z');
  });

  it('never ends before it starts', () => {
    for (const day of ['19', '22', '25', '29']) {
      const { from, to } = weekendWindow(new Date(`2026-10-${day}T23:30:00Z`));
      expect(new Date(to).getTime()).toBeGreaterThan(new Date(from).getTime());
    }
  });
});

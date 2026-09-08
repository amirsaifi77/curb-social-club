import { describe, expect, it } from '@jest/globals';

import { timeRange } from './format';

// event-detail-and-rsvp.md Copy, "S08 when, recurring": "Every Saturday,
// 7:30 to 10 am". The window is read off the next occurrence in the venue's
// own timezone.
describe('timeRange', () => {
  const LA = 'America/Los_Angeles';

  it('writes the meridiem once when both ends share it', () => {
    // 7:30 am to 10:00 am in Newport Beach.
    expect(timeRange('2026-10-24T14:30:00Z', '2026-10-24T17:00:00Z', LA)).toBe('7:30 to 10 am');
  });

  it('writes both when the meet crosses noon', () => {
    expect(timeRange('2026-10-24T18:00:00Z', '2026-10-24T21:00:00Z', LA)).toBe('11 am to 2 pm');
  });

  it('keeps the minutes on both ends when there are any', () => {
    expect(timeRange('2026-10-24T14:30:00Z', '2026-10-24T17:45:00Z', LA)).toBe('7:30 to 10:45 am');
  });

  it("reads the venue clock, not the reader's", () => {
    // The same instants in New York are three hours later.
    expect(timeRange('2026-10-24T14:30:00Z', '2026-10-24T17:00:00Z', 'America/New_York')).toBe(
      '10:30 am to 1 pm',
    );
  });

  it('has nothing to say about an unparseable instant', () => {
    expect(timeRange('not a date', '2026-10-24T17:00:00Z', LA)).toBeNull();
  });
});

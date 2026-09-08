import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as Calendar from 'expo-calendar/legacy';

import { addToCalendar, toRecurrenceRule } from './calendar';

const meet = {
  title: 'Back Bay Coffee',
  startsAt: '2026-10-24T14:30:00Z',
  endsAt: '2026-10-24T17:00:00Z',
  timezone: 'America/Los_Angeles',
  location: 'Lido Marina Village',
  notes: null,
  rrule: 'FREQ=WEEKLY;BYDAY=SA',
};

// docs/specs/event-detail-and-rsvp.md R-12 and AC-10.
describe('add to calendar', () => {
  beforeEach(() => {
    jest.mocked(Calendar.requestCalendarPermissionsAsync).mockResolvedValue({
      granted: true,
    } as never);
    jest.mocked(Calendar.getDefaultCalendarAsync).mockResolvedValue({ id: 'cal-1' } as never);
    jest.mocked(Calendar.createEventAsync).mockResolvedValue('event-1');
  });

  it('AC-10: writes one event carrying the recurrence rule', async () => {
    expect(await addToCalendar(meet)).toBe('added');

    expect(Calendar.createEventAsync).toHaveBeenCalledTimes(1);
    const written = jest.mocked(Calendar.createEventAsync).mock.calls[0]?.[1];
    expect(written).toMatchObject({
      title: 'Back Bay Coffee',
      timeZone: 'America/Los_Angeles',
      location: 'Lido Marina Village',
      recurrenceRule: { frequency: 'weekly', daysOfTheWeek: [{ dayOfTheWeek: 7 }] },
    });
  });

  it('R-12: a seasonal meet goes in once, with no repeat', async () => {
    await addToCalendar({ ...meet, cadence: 'seasonal' });

    const written = jest.mocked(Calendar.createEventAsync).mock.calls[0]?.[1];
    expect(written).not.toHaveProperty('recurrenceRule');
  });

  it('R-12: a one-off meet is written without a repeat', async () => {
    await addToCalendar({ ...meet, rrule: null });

    const written = jest.mocked(Calendar.createEventAsync).mock.calls[0]?.[1];
    expect(written).not.toHaveProperty('recurrenceRule');
  });

  it('R-12: refusing permission is its own answer, and writes nothing', async () => {
    jest.mocked(Calendar.requestCalendarPermissionsAsync).mockResolvedValue({
      granted: false,
    } as never);

    expect(await addToCalendar(meet)).toBe('denied');
    expect(Calendar.createEventAsync).not.toHaveBeenCalled();
  });

  it('a calendar that cannot be written is not a refusal', async () => {
    jest.mocked(Calendar.createEventAsync).mockRejectedValue(new Error('no calendar'));

    expect(await addToCalendar(meet)).toBe('failed');
  });

  it('R-12: translates the two shapes the API grammar actually emits', () => {
    // recurrence/rrule_validator.rb: FREQ=WEEKLY or FREQ=MONTHLY, always
    // with BYDAY, never with UNTIL or COUNT.
    expect(toRecurrenceRule('FREQ=WEEKLY;BYDAY=SA')).toEqual({
      frequency: 'weekly',
      daysOfTheWeek: [{ dayOfTheWeek: 7 }],
    });
    // "First Saturday of the month" is expressible, and losing the ordinal
    // would put the meet on the day of the month the series happens to
    // start on instead.
    expect(toRecurrenceRule('FREQ=MONTHLY;BYDAY=1SA')).toEqual({
      frequency: 'monthly',
      daysOfTheWeek: [{ dayOfTheWeek: 7, weekNumber: 1 }],
    });
    expect(toRecurrenceRule('FREQ=MONTHLY;BYDAY=-1SU')).toEqual({
      frequency: 'monthly',
      daysOfTheWeek: [{ dayOfTheWeek: 1, weekNumber: -1 }],
    });
    // Two days a week is two days, not one.
    expect(toRecurrenceRule('FREQ=WEEKLY;BYDAY=SA,SU')).toEqual({
      frequency: 'weekly',
      daysOfTheWeek: [{ dayOfTheWeek: 7 }, { dayOfTheWeek: 1 }],
    });
  });

  it('R-12: a seasonal meet is written once, not forever', () => {
    // The grammar forbids UNTIL, and events.rrule_until is not on the
    // payload, so nothing in hand can end the repeat. An unbounded weekly
    // entry would sit in a calendar for years.
    expect(toRecurrenceRule('FREQ=WEEKLY;BYDAY=SA', 'seasonal')).toBeUndefined();
    expect(toRecurrenceRule('FREQ=WEEKLY;BYDAY=SA', 'weekly')).toEqual({
      frequency: 'weekly',
      daysOfTheWeek: [{ dayOfTheWeek: 7 }],
    });
  });

  it('R-12: refuses a rule whose meaning lives in a part it cannot express', () => {
    expect(toRecurrenceRule('FREQ=MONTHLY;BYMONTHDAY=15')).toBeUndefined();
    expect(toRecurrenceRule('FREQ=YEARLY;BYMONTH=6')).toBeUndefined();
    // A BYDAY that cannot be read whole is not translated in part.
    expect(toRecurrenceRule('FREQ=WEEKLY;BYDAY=SA,XX')).toBeUndefined();
  });

  it('drops a count that would schedule nothing', () => {
    expect(toRecurrenceRule('FREQ=WEEKLY;COUNT=0')).toEqual({ frequency: 'weekly' });
    expect(toRecurrenceRule('FREQ=WEEKLY;INTERVAL=0')).toEqual({ frequency: 'weekly' });
  });
});

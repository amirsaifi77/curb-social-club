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
      recurrenceRule: { frequency: 'weekly' },
    });
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

  it('translates the parts of an RRULE a meet uses', () => {
    expect(toRecurrenceRule('FREQ=WEEKLY;BYDAY=SA')).toEqual({ frequency: 'weekly' });
    expect(toRecurrenceRule('RRULE:FREQ=MONTHLY;INTERVAL=2')).toEqual({
      frequency: 'monthly',
      interval: 2,
    });
    expect(toRecurrenceRule('FREQ=WEEKLY;COUNT=8')).toEqual({
      frequency: 'weekly',
      occurrence: 8,
    });
    expect(toRecurrenceRule('FREQ=WEEKLY;UNTIL=20261231T000000Z')).toEqual({
      frequency: 'weekly',
      endDate: new Date(Date.UTC(2026, 11, 31)),
    });
  });

  it('writes a single event rather than a wrong repeat for a rule it cannot read', () => {
    expect(toRecurrenceRule('FREQ=FORTNIGHTLY')).toBeUndefined();
    expect(toRecurrenceRule('nonsense')).toBeUndefined();
    expect(toRecurrenceRule('')).toBeUndefined();
  });

  it('R-12: refuses a rule whose meaning lives in a part it cannot express', () => {
    // "First Saturday of the month" would otherwise become "the 3rd of
    // every month", and "Saturday and Sunday" would lose Sunday.
    expect(toRecurrenceRule('FREQ=MONTHLY;BYDAY=1SA')).toBeUndefined();
    expect(toRecurrenceRule('FREQ=WEEKLY;BYDAY=SA,SU')).toBeUndefined();
    expect(toRecurrenceRule('FREQ=MONTHLY;BYMONTHDAY=15')).toBeUndefined();
    expect(toRecurrenceRule('FREQ=YEARLY;BYMONTH=6')).toBeUndefined();
  });

  it('R-12: a weekly rule on the day it starts is a plain weekly rule', () => {
    expect(toRecurrenceRule('FREQ=WEEKLY;BYDAY=SA')).toEqual({ frequency: 'weekly' });
  });

  it('reads a rule whatever its case and spacing', () => {
    expect(toRecurrenceRule('freq=weekly; interval=2')).toEqual({
      frequency: 'weekly',
      interval: 2,
    });
  });

  it('drops a count that would schedule nothing', () => {
    expect(toRecurrenceRule('FREQ=WEEKLY;COUNT=0')).toEqual({ frequency: 'weekly' });
    expect(toRecurrenceRule('FREQ=WEEKLY;INTERVAL=0')).toEqual({ frequency: 'weekly' });
  });
});

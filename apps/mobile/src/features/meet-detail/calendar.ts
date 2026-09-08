// The bare 'expo-calendar' entry is SDK 57's new class-based API, where
// every function used here is a stub that throws by design. The legacy
// entry is the supported path for these calls; migrating to the new API is
// its own change. Importing the wrong one is invisible from a test, because
// a mock stands in for the module either way.
import * as Calendar from 'expo-calendar/legacy';

// R-12: one calendar event, with the recurrence rule when the meet is a
// series, written after permission. The rrule comes from the API rather
// than being rebuilt here, so the calendar entry repeats the way the meet
// does.
export type CalendarOutcome = 'added' | 'denied' | 'failed';

export interface CalendarEvent {
  title: string;
  startsAt: string;
  endsAt: string;
  timezone: string;
  location: string;
  notes: string | null;
  rrule: string | null;
}

export async function addToCalendar(event: CalendarEvent): Promise<CalendarOutcome> {
  try {
    const permission = await Calendar.requestCalendarPermissionsAsync();
    if (!permission.granted) return 'denied';

    const calendar = await Calendar.getDefaultCalendarAsync();
    if (!calendar?.id) return 'failed';

    await Calendar.createEventAsync(calendar.id, {
      title: event.title,
      startDate: new Date(event.startsAt),
      endDate: new Date(event.endsAt),
      timeZone: event.timezone,
      location: event.location,
      notes: event.notes ?? undefined,
      ...(event.rrule ? { recurrenceRule: toRecurrenceRule(event.rrule) } : {}),
    });
    return 'added';
  } catch {
    // Refused and could not be written are different facts; only the first
    // has a message worth showing, so the second says nothing was added.
    return 'failed';
  }
}

// expo-calendar takes a structured rule, not an RRULE string, and it cannot
// express the BY* parts at all. A rule whose meaning depends on one of them
// is therefore not translated: writing it without the part would put the
// meet on the wrong days, which is worse than putting it on the calendar
// once. "First Saturday of the month" would become "the 3rd of every
// month"; "Saturday and Sunday" would quietly lose Sunday.
//
// The one exception is a weekly rule with a single BYDAY, which repeats on
// the same day the meet starts and so is already what a plain weekly rule
// means.
export function toRecurrenceRule(rrule: string): Calendar.RecurrenceRule | undefined {
  const parts: Record<string, string> = {};
  for (const pair of rrule.replace(/^RRULE:/i, '').split(';')) {
    const [key, value] = pair.split('=');
    if (key && value) parts[key.trim().toUpperCase()] = value.trim();
  }

  const frequency = FREQUENCIES[parts.FREQ?.toUpperCase() ?? ''];
  if (!frequency) return undefined;
  if (!expressible(parts, frequency)) return undefined;

  const interval = Number(parts.INTERVAL ?? 1);
  const count = Number(parts.COUNT);
  return {
    frequency,
    ...(Number.isFinite(interval) && interval > 1 ? { interval } : {}),
    ...(Number.isFinite(count) && count > 0 ? { occurrence: count } : {}),
    ...(parts.UNTIL ? { endDate: parseUntil(parts.UNTIL) } : {}),
  };
}

function expressible(parts: Record<string, string>, frequency: Calendar.Frequency): boolean {
  const byParts = Object.keys(parts).filter((key) => key.startsWith('BY'));
  if (byParts.length === 0) return true;
  // A weekly rule on one weekday is the weekday the meet starts on.
  return (
    frequency === FREQUENCIES.WEEKLY &&
    byParts.length === 1 &&
    byParts[0] === 'BYDAY' &&
    !parts.BYDAY.includes(',')
  );
}

const FREQUENCIES: Record<string, Calendar.Frequency> = {
  DAILY: Calendar.Frequency.DAILY,
  WEEKLY: Calendar.Frequency.WEEKLY,
  MONTHLY: Calendar.Frequency.MONTHLY,
  YEARLY: Calendar.Frequency.YEARLY,
};

// RRULE's UNTIL is basic ISO 8601 (20261231T000000Z), which Date cannot read.
function parseUntil(value: string): Date | undefined {
  const match = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})Z?)?$/.exec(value);
  if (!match) return undefined;
  const [, y, mo, d, h = '0', mi = '0', sec = '0'] = match;
  return new Date(
    Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(sec)),
  );
}

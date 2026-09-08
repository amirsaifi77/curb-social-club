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
  cadence?: string | null;
}

export async function addToCalendar(event: CalendarEvent): Promise<CalendarOutcome> {
  try {
    const permission = await Calendar.requestCalendarPermissionsAsync();
    if (!permission.granted) return 'denied';

    const calendar = await Calendar.getDefaultCalendarAsync();
    if (!calendar?.id) return 'failed';

    const rule = event.rrule ? toRecurrenceRule(event.rrule, event.cadence) : undefined;

    await Calendar.createEventAsync(calendar.id, {
      title: event.title,
      startDate: new Date(event.startsAt),
      endDate: new Date(event.endsAt),
      timeZone: event.timezone,
      location: event.location,
      notes: event.notes ?? undefined,
      ...(rule ? { recurrenceRule: rule } : {}),
    });
    return 'added';
  } catch {
    // Refused and could not be written are different facts; only the first
    // has a message worth showing, so the second says nothing was added.
    return 'failed';
  }
}

// The API's grammar (recurrence/rrule_validator.rb) emits exactly two
// shapes: FREQ=WEEKLY;BYDAY=<day> and FREQ=MONTHLY;BYDAY=<ordinal><day>,
// never UNTIL or COUNT. Both are expressible: expo-calendar takes
// `daysOfTheWeek` with a `weekNumber`, which is what an ordinal BYDAY means.
// Anything outside that grammar is not translated, because writing it
// without the part it depends on would put the meet on the wrong days.
export function toRecurrenceRule(
  rrule: string,
  cadence?: string | null,
): Calendar.RecurrenceRule | undefined {
  // A seasonal meet ends on a date the Event payload does not carry
  // (events.rrule_until is not serialized), and the rule itself cannot say
  // so because the grammar forbids UNTIL. An unbounded repeat would sit in
  // someone's calendar every week for years, so it stays a single event.
  if (cadence === 'seasonal') return undefined;

  const parts: Record<string, string> = {};
  for (const pair of rrule.replace(/^RRULE:/i, '').split(';')) {
    const [key, value] = pair.split('=');
    if (key && value) parts[key.trim().toUpperCase()] = value.trim();
  }

  const frequency = FREQUENCIES[parts.FREQ?.toUpperCase() ?? ''];
  if (!frequency) return undefined;

  const unsupported = Object.keys(parts).filter(
    (key) => key.startsWith('BY') && key !== 'BYDAY',
  );
  if (unsupported.length > 0) return undefined;

  const days = parts.BYDAY ? parseByDay(parts.BYDAY) : [];
  // A BYDAY that cannot be read whole is a rule that is not translated at
  // all, rather than one silently missing a day.
  if (days === null) return undefined;

  const interval = Number(parts.INTERVAL ?? 1);
  const count = Number(parts.COUNT);
  return {
    frequency,
    ...(days.length > 0 ? { daysOfTheWeek: days } : {}),
    ...(Number.isFinite(interval) && interval > 1 ? { interval } : {}),
    ...(Number.isFinite(count) && count > 0 ? { occurrence: count } : {}),
    ...(parts.UNTIL ? { endDate: parseUntil(parts.UNTIL) } : {}),
  };
}

const WEEKDAYS: Record<string, Calendar.DayOfTheWeek> = {
  SU: 1,
  MO: 2,
  TU: 3,
  WE: 4,
  TH: 5,
  FR: 6,
  SA: 7,
} as Record<string, Calendar.DayOfTheWeek>;

// "SA" is every Saturday; "1SA" is the first Saturday of the month and
// "-1SA" the last. Returns null when any part of the list cannot be read,
// so a rule is translated whole or not at all.
export function parseByDay(byDay: string): Calendar.DaysOfTheWeek[] | null {
  const days: Calendar.DaysOfTheWeek[] = [];
  for (const token of byDay.split(',')) {
    const match = /^([+-]?\d{1,2})?(SU|MO|TU|WE|TH|FR|SA)$/i.exec(token.trim());
    if (!match) return null;
    const day = WEEKDAYS[match[2]!.toUpperCase()];
    if (day === undefined) return null;
    const week = match[1] ? Number(match[1]) : undefined;
    days.push(week === undefined ? { dayOfTheWeek: day } : { dayOfTheWeek: day, weekNumber: week });
  }
  return days;
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

import * as Calendar from 'expo-calendar';

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

// expo-calendar takes a structured rule, not an RRULE string. Only the
// parts a meet uses are translated; anything else writes a single event
// rather than a wrong repeat.
export function toRecurrenceRule(rrule: string): Calendar.RecurrenceRule | undefined {
  const parts = Object.fromEntries(
    rrule
      .replace(/^RRULE:/i, '')
      .split(';')
      .map((pair) => pair.split('=') as [string, string]),
  );
  const frequency = FREQUENCIES[parts.FREQ?.toUpperCase() ?? ''];
  if (!frequency) return undefined;

  const interval = Number(parts.INTERVAL ?? 1);
  return {
    frequency,
    ...(Number.isFinite(interval) && interval > 1 ? { interval } : {}),
    ...(parts.COUNT ? { occurrence: Number(parts.COUNT) } : {}),
    ...(parts.UNTIL ? { endDate: parseUntil(parts.UNTIL) } : {}),
  };
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

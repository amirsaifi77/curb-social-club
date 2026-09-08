import type { EventSummary } from '@curb/api-client';

// Card formatting the RNTL tests assert on directly (discovery R-13).

const KM_PER_MILE = 1.609344;

export function miles(distanceM: number | null | undefined): string | null {
  if (distanceM == null) return null;
  const value = distanceM / 1000 / KM_PER_MILE;
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} mi`;
}

// The meet's own clock, not the reader's: a Newport meet reads 7:30 am
// whether you open the app in Newport or in New York.
export function dayAndTime(startsAt: string, timezone: string): string {
  const date = new Date(startsAt);
  const day = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: timezone,
  }).format(date);
  const time = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
  })
    .format(date)
    .replace(' AM', ' am')
    .replace(' PM', ' pm');
  return `${day}, ${time}`;
}

// The window a recurring meet keeps, read off the next occurrence:
// "7:30 to 10 am" (event-detail Copy, S08 when, recurring). The meridiem is
// written once when both ends share it, and a whole hour drops its ":00".
export function timeRange(startsAt: string, endsAt: string, timezone: string): string | null {
  const start = clockParts(startsAt, timezone);
  const end = clockParts(endsAt, timezone);
  if (!start || !end) return null;
  const opening = start.meridiem === end.meridiem ? start.time : `${start.time} ${start.meridiem}`;
  return `${opening} to ${end.time} ${end.meridiem}`;
}

// formatToParts rather than a string replace: the separator between the
// time and the meridiem is a narrow no-break space in newer ICU builds, so
// matching on " AM" quietly stops matching.
function clockParts(value: string, timezone: string): { time: string; meridiem: string } | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
  }).formatToParts(date);
  const hour = parts.find((part) => part.type === 'hour')?.value;
  const minute = parts.find((part) => part.type === 'minute')?.value;
  const meridiem = parts.find((part) => part.type === 'dayPeriod')?.value;
  if (!hour || !minute || !meridiem) return null;
  return { time: minute === '00' ? hour : `${hour}:${minute}`, meridiem: meridiem.toLowerCase() };
}

// Always pinned, never the reader's zone: a confirmation date that shifts
// when you fly east is a different string for the same fact. Falls back to
// UTC, which is how the API stores the instant.
export function shortDate(value: string, timezone = 'UTC'): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: timezone,
  }).format(new Date(value));
}

// R-13 and the events spec Copy table, word for word. Nothing at all once a
// host has claimed the meet.
export function confirmationChip(event: EventSummary): string | null {
  const confirmed = event.last_confirmed_at;
  if (event.claimed) return null;
  if (!confirmed) return null;
  const date = shortDate(confirmed, event.next_occurrence?.timezone);
  return event.stale ? `Check. Last confirmed ${date}.` : `Unclaimed. Last confirmed ${date}.`;
}

const SOURCE_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  evite: 'Evite',
  eventbrite: 'Eventbrite',
  meetup: 'Meetup',
  host: 'Host',
};

export function sourceLabel(type: string | null | undefined): string {
  if (!type) return 'Host';
  return SOURCE_LABELS[type.toLowerCase()] ?? 'Host';
}

// The link a host chip opens. Clients branch on `type` only for the link
// target (CLAUDE.md, one host shape). A host with no slug is not linkable.
export function hostHref(host: { type: string; slug: string | null }): string | null {
  if (!host.slug) return null;
  if (host.type === 'club') return `/clubs/${host.slug}`;
  if (host.type === 'sponsor') return `/sponsors/${host.slug}`;
  return `/u/${host.slug}`;
}

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

export function shortDate(value: string, timezone?: string): string {
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
  const date = shortDate(confirmed);
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

// Dates and distances on the web, in the venue's own clock. A meet's time
// is a fact about the lot, not about the reader's browser (CLAUDE.md).

export function dayAndTime(startsAt: string, timezone: string): string {
  const date = new Date(startsAt);
  const day = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: timezone,
  }).format(date);
  const time = clock(date, timezone);
  return time ? `${day}, ${time}` : day;
}

export function clock(date: Date, timezone: string): string | null {
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: timezone,
  }).formatToParts(date);
  const hour = parts.find((part) => part.type === 'hour')?.value;
  const minute = parts.find((part) => part.type === 'minute')?.value;
  const meridiem = parts.find((part) => part.type === 'dayPeriod')?.value;
  if (!hour || !minute || !meridiem) return null;
  return `${minute === '00' ? hour : `${hour}:${minute}`} ${meridiem.toLowerCase()}`;
}

// "Last confirmed Jul 12": pinned to the venue, never to the reader.
export function shortDate(value: string, timezone = 'UTC'): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: timezone,
  }).format(new Date(value));
}

const STALE_DAYS = 30;

export function isStale(lastConfirmedAt: string, now = new Date()): boolean {
  const confirmed = new Date(lastConfirmedAt).getTime();
  if (Number.isNaN(confirmed)) return false;
  return now.getTime() - confirmed > STALE_DAYS * 24 * 60 * 60 * 1000;
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

// R-7: directions by platform. Apple Maps on Apple hardware, Google Maps
// everywhere else, both with the coordinates and the name so the pin lands
// on the lot rather than on a geocoded guess at the address.
export function directionsUrl(
  venue: { name: string; location: { lat: number; lng: number } },
  userAgent: string | null | undefined,
): string {
  const { lat, lng } = venue.location;
  const query = encodeURIComponent(venue.name);
  const apple = /iPhone|iPad|iPod|Macintosh/i.test(userAgent ?? '');
  return apple
    ? `https://maps.apple.com/?ll=${lat},${lng}&q=${query}`
    : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

// The host page a chip opens. Clients branch on `type` only for the link
// target (CLAUDE.md, one host shape).
export function hostPath(host: { type: string; slug: string | null }): string | null {
  if (!host.slug) return null;
  if (host.type === 'club') return `/clubs/${host.slug}`;
  if (host.type === 'sponsor') return `/sponsors/${host.slug}`;
  return `/u/${host.slug}`;
}

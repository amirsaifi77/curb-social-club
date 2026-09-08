import type { EventDetail, EventSummary, Occurrence } from '@curb/api-client';

// web.md R-5, R-6, R-11. One builder for the meta every indexable page
// carries, and the JSON-LD a crawler reads off W03.

export const SITE_TITLE_SUFFIX = 'curb';

export interface PageMetaInput {
  title: string;
  description: string;
  /** Absolute canonical URL, or null when SHARE_BASE_URL is unset. */
  canonical: string | null;
  /** Absolute OG image URL. */
  image?: string | null;
  /** R-14: a search result page is not a page to index. */
  noindex?: boolean;
  /** R-11: only when App Store Connect has reserved an id. */
  appStoreId?: string | null;
}

type MetaDescriptor = Record<string, unknown>;

// The site title suffix is appended once: a title that already ends in it
// (the home page) is left alone rather than reading "curb | curb".
export function pageTitle(title: string): string {
  return title === SITE_TITLE_SUFFIX ? title : `${title} | ${SITE_TITLE_SUFFIX}`;
}

export function pageMeta(input: PageMetaInput): MetaDescriptor[] {
  const title = pageTitle(input.title);
  const tags: MetaDescriptor[] = [
    { title },
    { name: 'description', content: input.description },
    { property: 'og:title', content: title },
    { property: 'og:description', content: input.description },
    { property: 'og:type', content: 'website' },
    { name: 'twitter:card', content: 'summary_large_image' },
  ];

  if (input.canonical) {
    tags.push({ tagName: 'link', rel: 'canonical', href: input.canonical });
    tags.push({ property: 'og:url', content: input.canonical });
  }
  if (input.image) tags.push({ property: 'og:image', content: input.image });
  if (input.noindex) tags.push({ name: 'robots', content: 'noindex' });
  // R-11: app-argument is the canonical URL, so the banner opens the same
  // page in the app rather than the app's home screen.
  if (input.appStoreId && input.canonical) {
    tags.push({
      name: 'apple-itunes-app',
      content: `app-id=${input.appStoreId}, app-argument=${input.canonical}`,
    });
  }
  return tags;
}

// JSON.stringify escapes nothing HTML cares about, so a stored "</script>"
// in a title, a venue name or a sponsor's name closes the block and runs
// whatever follows it. The values here come from hosts and from the
// importer, so this is the difference between structured data and script
// injection. \u003c is valid JSON that parses back to "<", so a crawler
// reads exactly the same document.
export function jsonLdScript(json: JsonLd): string {
  return JSON.stringify(json)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

export function canonicalUrl(baseUrl: string | null, path: string): string | null {
  return baseUrl ? `${baseUrl}${path}` : null;
}

// The token travels with the card: /og/meets/:slug.png reads the same
// endpoint the page does, and refuses an unlisted meet without it.
export function ogImageUrl(
  baseUrl: string | null,
  slug: string,
  token?: string | null,
): string | null {
  if (!baseUrl) return null;
  const query = token ? `?token=${encodeURIComponent(token)}` : '';
  return `${baseUrl}/og/meets/${encodeURIComponent(slug)}.png${query}`;
}

// R-6's JSON-LD. Written as plain objects so the tests read as the shape a
// crawler sees, and rendered by the caller inside a script tag.
export interface JsonLd {
  [key: string]: unknown;
}

const DAY_BY_CODE: Record<string, string> = {
  MO: 'https://schema.org/Monday',
  TU: 'https://schema.org/Tuesday',
  WE: 'https://schema.org/Wednesday',
  TH: 'https://schema.org/Thursday',
  FR: 'https://schema.org/Friday',
  SA: 'https://schema.org/Saturday',
  SU: 'https://schema.org/Sunday',
};

const FREQUENCY_UNIT: Record<string, string> = {
  DAILY: 'D',
  WEEKLY: 'W',
  MONTHLY: 'M',
  YEARLY: 'Y',
};

// schema.org's repeatFrequency is an ISO duration, so INTERVAL is part of
// it rather than a field of its own: "Every other Sunday" is P2W, not P1W
// with a 2 hiding somewhere a crawler does not read.
function repeatFrequency(freq: string | undefined, interval: string | undefined): string | null {
  const unit = freq ? FREQUENCY_UNIT[freq.toUpperCase()] : undefined;
  if (!unit) return null;
  const count = Number(interval ?? 1);
  const every = Number.isInteger(count) && count > 0 ? count : 1;
  return `P${every}${unit}`;
}

function rruleParts(rrule: string): Record<string, string> {
  const parts: Record<string, string> = {};
  for (const piece of rrule.split(';')) {
    const [key, value] = piece.split('=');
    if (key && value) parts[key.toUpperCase()] = value;
  }
  return parts;
}

// The wall-clock time in the venue's own zone, which is what a Schedule's
// startTime means. Reading it off the instant in the server's zone would
// put a Newport meet an hour out whenever Vercel runs somewhere else.
export function localTime(instant: string, timezone: string): string | null {
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timezone,
  }).formatToParts(date);
  const hour = parts.find((part) => part.type === 'hour')?.value;
  const minute = parts.find((part) => part.type === 'minute')?.value;
  if (!hour || !minute) return null;
  // Intl writes midnight as 24 in some ICU builds under hour12: false.
  return `${hour === '24' ? '00' : hour}:${minute}`;
}

export function localDate(instant: string, timezone: string): string | null {
  const date = new Date(instant);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: timezone,
  }).formatToParts(date);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  return year && month && day ? `${year}-${month}-${day}` : null;
}

// R-6: a Schedule for a recurring event, and nothing at all for a one-off.
// The API's grammar emits FREQ=WEEKLY;BYDAY=<day> and
// FREQ=MONTHLY;BYDAY=<ordinal><day> (recurrence/rrule_validator.rb), so the
// ordinal is dropped here: schema.org's byDay is a day, not an ordinal, and
// a Schedule that claimed every Saturday for a first-Saturday meet would be
// worse than one that only names the frequency.
export function eventSchedule(event: EventDetail): JsonLd | null {
  if (!event.recurring || !event.rrule) return null;
  const parts = rruleParts(event.rrule);
  const frequency = repeatFrequency(parts.FREQ, parts.INTERVAL);
  if (!frequency) return null;

  const occurrence = event.upcoming_occurrences[0];
  const timezone = occurrence?.timezone ?? event.venue.timezone;
  const byDay = (parts.BYDAY ?? '')
    .split(',')
    .map((code) => DAY_BY_CODE[code.replace(/^[+-]?\d+/, '').toUpperCase()])
    .filter((day): day is string => Boolean(day));

  const schedule: JsonLd = {
    '@type': 'Schedule',
    repeatFrequency: frequency,
    scheduleTimezone: timezone,
  };
  if (byDay.length > 0) schedule.byDay = byDay;

  if (occurrence) {
    const startTime = localTime(occurrence.starts_at, timezone);
    const endTime = localTime(occurrence.ends_at, timezone);
    const startDate = localDate(occurrence.starts_at, timezone);
    if (startTime) schedule.startTime = startTime;
    if (endTime) schedule.endTime = endTime;
    if (startDate) schedule.startDate = startDate;
  }
  // R-6: a seasonal series ends on rrule_until. The payload carries it now,
  // so the Schedule says when the series stops rather than reading as one
  // that repeats forever.
  if (event.rrule_until) schedule.endDate = event.rrule_until;
  return schedule;
}

// R-6: a club or sponsor host is an Organization, a person is a Person.
export function organizer(event: EventDetail, baseUrl: string | null): JsonLd | null {
  const host = event.host;
  if (!host) return null;
  const isOrganization = host.type === 'club' || host.type === 'sponsor';
  const path =
    host.type === 'club' ? 'clubs' : host.type === 'sponsor' ? 'sponsors' : 'u';
  return {
    '@type': isOrganization ? 'Organization' : 'Person',
    name: host.name,
    ...(host.slug && baseUrl ? { url: `${baseUrl}/${path}/${host.slug}` } : {}),
  };
}

export interface EventJsonLdInput {
  event: EventDetail;
  baseUrl: string | null;
  /** The occurrence the page is about; the next one on W03. */
  occurrence?: { starts_at: string; ends_at: string; status: string } | null;
}

export function eventJsonLd({ event, baseUrl, occurrence }: EventJsonLdInput): JsonLd {
  const next = occurrence ?? event.upcoming_occurrences[0] ?? null;
  const venue = event.venue;
  const cancelled = event.status === 'cancelled' || next?.status === 'cancelled';

  const json: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    isAccessibleForFree: true,
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    eventStatus: cancelled
      ? 'https://schema.org/EventCancelled'
      : 'https://schema.org/EventScheduled',
    location: {
      '@type': 'Place',
      name: venue.name,
      address: {
        '@type': 'PostalAddress',
        ...(venue.address_line1 ? { streetAddress: venue.address_line1 } : {}),
        ...(venue.city ? { addressLocality: venue.city } : {}),
        ...(venue.region ? { addressRegion: venue.region } : {}),
        ...(venue.postal_code ? { postalCode: venue.postal_code } : {}),
        addressCountry: venue.country,
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: venue.location.lat,
        longitude: venue.location.lng,
      },
    },
  };

  if (next) {
    json.startDate = next.starts_at;
    json.endDate = next.ends_at;
  }
  if (event.description) json.description = event.description;
  if (event.cover_url) json.image = event.cover_url;
  const url = canonicalUrl(baseUrl, `/meets/${event.slug}`);
  if (url) json.url = url;

  const host = organizer(event, baseUrl);
  if (host) json.organizer = host;

  const sponsors = event.sponsorships.map((sponsorship) => ({
    '@type': 'Organization',
    name: sponsorship.sponsor.name,
    ...(baseUrl ? { url: `${baseUrl}/sponsors/${sponsorship.sponsor.slug}` } : {}),
  }));
  if (sponsors.length > 0) json.sponsor = sponsors;

  const schedule = eventSchedule(event);
  if (schedule) json.eventSchedule = schedule;

  return json;
}

// W04 is one date of the same event, so its JSON-LD is the event's with the
// occurrence's own times and status, and never a Schedule: a page about one
// date does not repeat.
export function occurrenceJsonLd(
  event: EventDetail,
  occurrence: Occurrence,
  baseUrl: string | null,
): JsonLd {
  const json = eventJsonLd({ event, baseUrl, occurrence });
  delete json.eventSchedule;
  const url = canonicalUrl(baseUrl, `/meets/${event.slug}/${occurrence.id}`);
  if (url) json.url = url;
  return json;
}

// The description a meet's page and its card carry: the venue and the city,
// then the host, which is what a search result needs to be worth tapping.
export function eventDescription(event: EventDetail | EventSummary): string {
  const parts = [event.venue.name, event.venue.city].filter(Boolean);
  const where = parts.join(', ');
  const host = event.host?.name;
  return host ? `${where}. Hosted by ${host}.` : `${where}.`;
}

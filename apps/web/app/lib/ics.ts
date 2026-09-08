// W03's "Add to calendar": one .ics the browser downloads, since the web
// app has no calendar permission to ask for. RFC 5545, and the recurrence
// rule the API already sends, so a series lands as a series.

export interface IcsInput {
  uid: string;
  title: string;
  startsAt: string;
  endsAt: string;
  /** The venue's IANA zone. A recurring meet is written in it. */
  timezone: string;
  url: string | null;
  location?: string | null;
  description?: string | null;
  /** The event's RRULE, without the RRULE: prefix. */
  rrule?: string | null;
  /** Written into DTSTAMP; injectable so a test is not a clock. */
  now?: Date;
}

// RFC 5545 escaping: a comma, semicolon or backslash in a venue name would
// otherwise end the property early and truncate the entry.
export function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

export function icsTimestamp(value: string | Date): string | null {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
}

// The same instant as a local wall-clock time in a named zone. A repeating
// meet written as a floating UTC instant plus an RRULE moves an hour at
// every DST change: a 7:30 am Pacific meet becomes 8:30 am in November, for
// every occurrence, in the subscriber's own calendar.
export function icsLocal(value: string, timezone: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: timezone,
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value;
  const [year, month, day, hour, minute, second] = [
    get('year'),
    get('month'),
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  ];
  if (!year || !month || !day || !hour || !minute || !second) return null;
  return `${year}${month}${day}T${hour === '24' ? '00' : hour}${minute}${second}`;
}

// Lines over 75 octets have to fold, or a long description silently breaks
// the file in some clients.
export function fold(line: string): string[] {
  // RFC 5545 counts octets, not characters: an accented venue name folded
  // by string length produces lines over the limit and, worse, can split a
  // multi-byte character in half.
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return [line];

  const out: string[] = [];
  let current = '';
  let limit = 75;
  for (const character of line) {
    const width = encoder.encode(character).length;
    if (encoder.encode(current).length + width > limit) {
      out.push(out.length === 0 ? current : ` ${current}`);
      current = '';
      limit = 74;
    }
    current += character;
  }
  if (current.length > 0) out.push(out.length === 0 ? current : ` ${current}`);
  return out;
}

export function buildIcs(input: IcsInput): string | null {
  const stamp = icsTimestamp(input.now ?? new Date());
  if (!stamp) return null;

  // A one-off is an instant and UTC says so exactly. A series is a local
  // time that repeats, so it is written in the venue's zone.
  const repeating = Boolean(input.rrule);
  const start = repeating
    ? icsLocal(input.startsAt, input.timezone)
    : icsTimestamp(input.startsAt);
  const end = repeating ? icsLocal(input.endsAt, input.timezone) : icsTimestamp(input.endsAt);
  if (!start || !end) return null;
  const tzid = repeating ? `;TZID=${input.timezone}` : '';

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Curb Social Club//curb//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${input.uid}@curbsocial.club`,
    `DTSTAMP:${stamp}`,
    `DTSTART${tzid}:${start}`,
    `DTEND${tzid}:${end}`,
    `SUMMARY:${escapeText(input.title)}`,
  ];
  if (input.location) lines.push(`LOCATION:${escapeText(input.location)}`);
  if (input.description) lines.push(`DESCRIPTION:${escapeText(input.description)}`);
  if (input.url) lines.push(`URL:${input.url}`);
  if (input.rrule) lines.push(`RRULE:${input.rrule}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');

  return `${lines.flatMap(fold).join('\r\n')}\r\n`;
}

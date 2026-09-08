// W03's "Add to calendar": one .ics the browser downloads, since the web
// app has no calendar permission to ask for. RFC 5545, and the recurrence
// rule the API already sends, so a series lands as a series.

export interface IcsInput {
  uid: string;
  title: string;
  startsAt: string;
  endsAt: string;
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

// Lines over 75 octets have to fold, or a long description silently breaks
// the file in some clients.
export function fold(line: string): string[] {
  if (line.length <= 75) return [line];
  const out: string[] = [line.slice(0, 75)];
  let rest = line.slice(75);
  while (rest.length > 74) {
    out.push(` ${rest.slice(0, 74)}`);
    rest = rest.slice(74);
  }
  if (rest.length > 0) out.push(` ${rest}`);
  return out;
}

export function buildIcs(input: IcsInput): string | null {
  const start = icsTimestamp(input.startsAt);
  const end = icsTimestamp(input.endsAt);
  const stamp = icsTimestamp(input.now ?? new Date());
  if (!start || !end || !stamp) return null;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Curb Social Club//curb//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${input.uid}@curbsocial.club`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeText(input.title)}`,
  ];
  if (input.location) lines.push(`LOCATION:${escapeText(input.location)}`);
  if (input.description) lines.push(`DESCRIPTION:${escapeText(input.description)}`);
  if (input.url) lines.push(`URL:${input.url}`);
  if (input.rrule) lines.push(`RRULE:${input.rrule}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');

  return `${lines.flatMap(fold).join('\r\n')}\r\n`;
}

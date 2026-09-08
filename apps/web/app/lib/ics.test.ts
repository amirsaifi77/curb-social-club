import { describe, expect, it } from 'vitest';

import { buildIcs, escapeText, fold, icsTimestamp } from './ics';

describe('buildIcs', () => {
  const base = {
    uid: '11111111-1111-4111-8111-111111111111',
    title: 'Lido Saturday',
    startsAt: '2026-10-24T14:30:00Z',
    endsAt: '2026-10-24T17:00:00Z',
    url: 'https://curbsocial.club/meets/lido-saturday',
    location: 'Lido Marina Village, 3434 Via Lido, Newport Beach, CA',
    timezone: 'America/Los_Angeles',
    now: new Date('2026-09-08T08:00:00Z'),
  };

  it('writes one VEVENT with the times as UTC instants', () => {
    const ics = buildIcs(base);

    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('DTSTART:20261024T143000Z');
    expect(ics).toContain('DTEND:20261024T170000Z');
    expect(ics).toContain('DTSTAMP:20260908T080000Z');
    expect(ics).toContain('SUMMARY:Lido Saturday');
    expect(ics?.endsWith('END:VCALENDAR\r\n')).toBe(true);
  });

  it('carries the recurrence rule, so a series lands as a series', () => {
    expect(buildIcs({ ...base, rrule: 'FREQ=WEEKLY;BYDAY=SA' })).toContain(
      'RRULE:FREQ=WEEKLY;BYDAY=SA',
    );
  });

  it('writes a series in the venue clock, so it does not drift at DST', () => {
    // 14:30Z is 07:30 in Newport Beach. As a floating UTC instant plus an
    // RRULE, every occurrence after the November change would land at 08:30.
    const ics = buildIcs({ ...base, rrule: 'FREQ=WEEKLY;BYDAY=SA' });

    expect(ics).toContain('DTSTART;TZID=America/Los_Angeles:20261024T073000');
    expect(ics).toContain('DTEND;TZID=America/Los_Angeles:20261024T100000');
    expect(ics).not.toContain('DTSTART:20261024T143000Z');
  });

  it('a one-off has no rule at all, and stays an exact instant', () => {
    const ics = buildIcs({ ...base, rrule: null });

    expect(ics).not.toContain('RRULE');
    // One date is one instant, and UTC says which one without a zone.
    expect(ics).toContain('DTSTART:20261024T143000Z');
  });

  it('answers null rather than a file with a broken date', () => {
    expect(buildIcs({ ...base, startsAt: 'not a date' })).toBeNull();
  });

  it('uses CRLF, which is what the format requires', () => {
    const ics = buildIcs(base) ?? '';

    expect(ics.split('\r\n').length).toBeGreaterThan(5);
    expect(ics.replace(/\r\n/g, '')).not.toContain('\n');
  });
});

describe('escapeText', () => {
  it('escapes the characters that would end a property early', () => {
    // A venue with a comma in its name truncated the entry before this.
    expect(escapeText('Lido Marina Village, Newport Beach')).toBe(
      'Lido Marina Village\\, Newport Beach',
    );
    expect(escapeText('gate; then left')).toBe('gate\\; then left');
    expect(escapeText('a\\b')).toBe('a\\\\b');
    expect(escapeText('one\ntwo')).toBe('one\\ntwo');
  });

  it('escapes the backslash before anything that adds one', () => {
    expect(escapeText('a\\,b')).toBe('a\\\\\\,b');
  });
});

describe('fold', () => {
  it('leaves a short line alone', () => {
    expect(fold('SUMMARY:Lido Saturday')).toEqual(['SUMMARY:Lido Saturday']);
  });

  it('folds a long line with a leading space, per RFC 5545', () => {
    const folded = fold(`DESCRIPTION:${'x'.repeat(200)}`);

    expect(folded.length).toBeGreaterThan(1);
    expect(folded[0]).toHaveLength(75);
    for (const line of folded.slice(1)) expect(line.startsWith(' ')).toBe(true);
    expect(folded.join('').replace(/ /g, '')).toBe(`DESCRIPTION:${'x'.repeat(200)}`);
  });

  it('counts octets, not characters, and never splits one in half', () => {
    // The format's limit is 75 octets. Folding by string length puts an
    // accented venue name over it, and can cut a multi-byte character.
    const encoder = new TextEncoder();
    const folded = fold(`LOCATION:${'é'.repeat(80)}`);

    for (const line of folded) expect(encoder.encode(line).length).toBeLessThanOrEqual(75);
    expect(folded.map((line, index) => (index === 0 ? line : line.slice(1))).join('')).toBe(
      `LOCATION:${'é'.repeat(80)}`,
    );
  });
});

describe('icsTimestamp', () => {
  it('has nothing to say about an unparseable value', () => {
    expect(icsTimestamp('nope')).toBeNull();
  });
});

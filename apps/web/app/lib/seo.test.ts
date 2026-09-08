import { describe, expect, it } from 'vitest';

import { eventJsonLd, eventSchedule, localTime, occurrenceJsonLd, pageMeta } from './seo';

import { eventDetail, occurrence } from '~/test/fixtures';


const BASE = 'https://curbsocial.club';

// web.md AC-1 and AC-2 are about what a crawler reads off W03, so these
// assert the JSON-LD shape rather than the page's markup.

describe('eventJsonLd', () => {
  it('AC-1: a recurring club-hosted meet with a sponsor', () => {
    const json = eventJsonLd({ event: eventDetail(), baseUrl: BASE });

    expect(json['@type']).toBe('Event');
    expect(json.name).toBe('Lido Saturday');
    expect(json.url).toBe(`${BASE}/meets/lido-saturday`);
    expect(json.startDate).toBe('2026-10-24T14:30:00Z');
    expect(json.endDate).toBe('2026-10-24T17:00:00Z');
    expect(json.isAccessibleForFree).toBe(true);
    expect(json.eventAttendanceMode).toBe('https://schema.org/OfflineEventAttendanceMode');
    expect(json.eventStatus).toBe('https://schema.org/EventScheduled');

    // R-6: a club host is an Organization, and one sponsor entry.
    expect(json.organizer).toMatchObject({
      '@type': 'Organization',
      name: 'Back Bay Air-Cooled',
      url: `${BASE}/clubs/back-bay-air-cooled`,
    });
    expect(json.sponsor).toHaveLength(1);
    expect(json.sponsor).toMatchObject([{ '@type': 'Organization', name: 'Bear Coast Coffee' }]);

    // The Place carries an address and coordinates, which is what puts the
    // pin on the lot rather than on a geocoded guess.
    expect(json.location).toMatchObject({
      '@type': 'Place',
      name: 'Lido Marina Village',
      address: { '@type': 'PostalAddress', addressLocality: 'Newport Beach', addressRegion: 'CA' },
      geo: { '@type': 'GeoCoordinates', latitude: 33.62, longitude: -117.93 },
    });

    expect(json.eventSchedule).toMatchObject({
      '@type': 'Schedule',
      repeatFrequency: 'P1W',
      byDay: ['https://schema.org/Saturday'],
    });
  });

  it('AC-1: a user host is a Person, not an Organization', () => {
    const event = eventDetail({
      host: {
        type: 'user',
        id: 'u1',
        slug: 'amir',
        name: 'Amir',
        avatar_url: null,
        verified: false,
        kind: null,
      },
    });

    expect(eventJsonLd({ event, baseUrl: BASE }).organizer).toMatchObject({
      '@type': 'Person',
      name: 'Amir',
      url: `${BASE}/u/amir`,
    });
  });

  it('AC-2: a one-off cancelled meet has no schedule and says it is cancelled', () => {
    const event = eventDetail({
      recurring: false,
      rrule: null,
      cadence: 'once',
      rrule_text: null,
      upcoming_occurrences: [
        {
          id: 'occ-1',
          starts_at: '2026-10-24T14:30:00Z',
          ends_at: '2026-10-24T17:00:00Z',
          timezone: 'America/Los_Angeles',
          going_count: 0,
          status: 'cancelled',
          override_note: 'rain',
        },
      ],
    });
    const json = eventJsonLd({ event, baseUrl: BASE });

    expect(json.eventSchedule).toBeUndefined();
    expect(json.eventStatus).toBe('https://schema.org/EventCancelled');
  });

  it('omits the URL rather than inventing an origin when SHARE_BASE_URL is unset', () => {
    const json = eventJsonLd({ event: eventDetail(), baseUrl: null });

    expect(json.url).toBeUndefined();
    expect(json.organizer).not.toHaveProperty('url');
  });
});

describe('eventSchedule', () => {
  it('folds INTERVAL into repeatFrequency, where a crawler reads it', () => {
    const event = eventDetail({ rrule: 'FREQ=WEEKLY;INTERVAL=2;BYDAY=SU' });

    expect(eventSchedule(event)).toMatchObject({
      repeatFrequency: 'P2W',
      byDay: ['https://schema.org/Sunday'],
    });
  });

  it('drops the ordinal from a monthly BYDAY rather than claiming every Saturday', () => {
    // schema.org's byDay is a day, not an ordinal. "First Saturday" cannot
    // be said here, and saying "every Saturday" would be worse than saying
    // the frequency alone.
    const schedule = eventSchedule(eventDetail({ rrule: 'FREQ=MONTHLY;BYDAY=1SA' }));

    expect(schedule).toMatchObject({
      repeatFrequency: 'P1M',
      byDay: ['https://schema.org/Saturday'],
    });
  });

  it('reads the times in the venue clock, not the server one', () => {
    const schedule = eventSchedule(eventDetail());

    // 14:30Z is 07:30 in Newport Beach.
    expect(schedule).toMatchObject({
      startTime: '07:30',
      endTime: '10:00',
      startDate: '2026-10-24',
      scheduleTimezone: 'America/Los_Angeles',
    });
  });

  it('has nothing to say about a one-off', () => {
    expect(eventSchedule(eventDetail({ recurring: false, rrule: null }))).toBeNull();
  });
});

describe('localTime', () => {
  it('writes midnight as 00, not 24', () => {
    expect(localTime('2026-10-24T07:00:00Z', 'America/Los_Angeles')).toBe('00:00');
  });

  it('has nothing to say about an unparseable instant', () => {
    expect(localTime('not a date', 'America/Los_Angeles')).toBeNull();
  });
});

describe('occurrenceJsonLd', () => {
  it('AC-4: one date is not a repeating series', () => {
    const json = occurrenceJsonLd(eventDetail(), occurrence(), BASE);

    expect(json.eventSchedule).toBeUndefined();
    expect(json.url).toBe(`${BASE}/meets/lido-saturday/44444444-4444-4444-8444-444444444444`);
  });

  it('carries the occurrence status, so a cancelled date says so', () => {
    const json = occurrenceJsonLd(eventDetail(), occurrence({ status: 'cancelled' }), BASE);

    expect(json.eventStatus).toBe('https://schema.org/EventCancelled');
  });

  it('AC-4: the date carries its own times, not the series next date', () => {
    const json = occurrenceJsonLd(
      eventDetail(),
      occurrence({ starts_at: '2026-10-31T14:30:00Z', ends_at: '2026-10-31T17:00:00Z' }),
      BASE,
    );

    expect(json.startDate).toBe('2026-10-31T14:30:00Z');
    expect(json.endDate).toBe('2026-10-31T17:00:00Z');
  });
});

describe('pageMeta', () => {
  it('AC-1: canonical, og, twitter card and the smart banner', () => {
    const tags = pageMeta({
      title: 'Lido Saturday',
      description: 'Lido Marina Village, Newport Beach.',
      canonical: `${BASE}/meets/lido-saturday`,
      image: `${BASE}/og/meets/lido-saturday.png`,
      appStoreId: '6740000000',
    });

    expect(tags).toContainEqual({ title: 'Lido Saturday | curb' });
    expect(tags).toContainEqual({
      tagName: 'link',
      rel: 'canonical',
      href: `${BASE}/meets/lido-saturday`,
    });
    expect(tags).toContainEqual({ name: 'twitter:card', content: 'summary_large_image' });
    expect(tags).toContainEqual({
      property: 'og:image',
      content: `${BASE}/og/meets/lido-saturday.png`,
    });
    expect(tags).toContainEqual({
      name: 'apple-itunes-app',
      content: `app-id=6740000000, app-argument=${BASE}/meets/lido-saturday`,
    });
  });

  it('R-11: no store id, no smart banner', () => {
    const tags = pageMeta({
      title: 'Lido Saturday',
      description: 'x',
      canonical: `${BASE}/meets/lido-saturday`,
      appStoreId: null,
    });

    expect(tags.some((tag) => tag.name === 'apple-itunes-app')).toBe(false);
  });

  it('AC-10: a search page is noindex', () => {
    const tags = pageMeta({ title: 'Meets', description: 'x', canonical: null, noindex: true });

    expect(tags).toContainEqual({ name: 'robots', content: 'noindex' });
    // No canonical to point at when the deployment has no origin.
    expect(tags.some((tag) => tag.rel === 'canonical')).toBe(false);
  });
});

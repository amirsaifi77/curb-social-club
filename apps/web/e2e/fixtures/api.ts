// The API responses the e2e suite runs against, so Playwright never needs a
// Rails server. Shapes come from docs/api.md; the values are the seeded
// meets the specs use in their examples.

export const CLUB_HOST = {
  type: 'club',
  id: '22222222-2222-4222-8222-222222222222',
  slug: 'back-bay-air-cooled',
  name: 'Back Bay Air-Cooled',
  avatar_url: null,
  verified: false,
  kind: null,
};

export const VENUE = {
  id: '33333333-3333-4333-8333-333333333333',
  name: 'Lido Marina Village',
  address_line1: '3434 Via Lido',
  address_line2: null,
  city: 'Newport Beach',
  region: 'CA',
  postal_code: '92663',
  country: 'US',
  timezone: 'America/Los_Angeles',
  location: { lat: 33.62, lng: -117.93 },
};

export function eventSummary(overrides: Record<string, unknown> = {}) {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    slug: 'lido-saturday',
    title: 'Lido Saturday',
    cover_url: null,
    cover_blurhash: null,
    tags: ['all'],
    recurring: true,
    rrule_text: 'Every Saturday',
    host: CLUB_HOST,
    venue: { id: VENUE.id, name: VENUE.name, city: VENUE.city, location: VENUE.location },
    next_occurrence: {
      id: '44444444-4444-4444-8444-444444444444',
      starts_at: '2026-10-24T14:30:00Z',
      ends_at: '2026-10-24T17:00:00Z',
      timezone: 'America/Los_Angeles',
      going_count: 12,
      status: 'scheduled',
    },
    distance_m: 1200,
    source: { type: 'instagram', url: 'https://instagram.com/p/abc' },
    claimed: false,
    cadence: 'weekly',
    stale: false,
    last_confirmed_at: '2026-07-12T12:00:00Z',
    sponsors_preview: [],
    ...overrides,
  };
}

export function eventDetail(overrides: Record<string, unknown> = {}) {
  return {
    ...eventSummary(),
    venue: VENUE,
    description: 'Coffee is inside, parking is wherever there is room.',
    parking_note: 'lot behind the bakery',
    rrule: 'FREQ=WEEKLY;BYDAY=SA',
    dtstart: '2026-10-24T14:30:00Z',
    duration_minutes: 150,
    rsvp_mode: 'count_only',
    capacity: null,
    status: 'published',
    visibility: 'public',
    dormant: false,
    hidden: false,
    external_host_name: '@backbayaircooled',
    upcoming_occurrences: [
      {
        id: '44444444-4444-4444-8444-444444444444',
        starts_at: '2026-10-24T14:30:00Z',
        ends_at: '2026-10-24T17:00:00Z',
        timezone: 'America/Los_Angeles',
        going_count: 12,
        status: 'scheduled',
        override_note: null,
        overridden_at: null,
      },
    ],
    sponsorships: [
      {
        sponsor: {
          id: '55555555-5555-4555-8555-555555555555',
          slug: 'bear-coast',
          name: 'Bear Coast Coffee',
          kind: 'vendor',
          logo_url: null,
          verified: false,
          tagline: null,
          followers_count: 8,
          home_label: null,
          distance_m: null,
        },
        role: 'coffee',
        note: 'Pour-over from the cart',
        position: 0,
      },
    ],
    viewer: {
      following: false,
      rsvp: null,
      can_edit: false,
      can_claim: true,
      claim_status: null,
      reported: false,
    },
    photos_count: 0,
    comments_count: 0,
    followers_count: 3,
    ...overrides,
  };
}

// AC-2: a one-off cancelled meet.
export const CANCELLED = eventDetail({
  slug: 'fontana-sunday',
  title: 'Fontana Sunday',
  recurring: false,
  rrule: null,
  rrule_text: null,
  cadence: 'once',
  upcoming_occurrences: [
    {
      id: '66666666-6666-4666-8666-666666666666',
      starts_at: '2026-10-25T15:00:00Z',
      ends_at: '2026-10-25T18:00:00Z',
      timezone: 'America/Los_Angeles',
      going_count: 0,
      status: 'cancelled',
      override_note: 'rain',
      overridden_at: '2026-10-20T12:00:00Z',
    },
  ],
});

// AC-3: an unlisted meet, which needs its token.
export const UNLISTED = eventDetail({
  slug: 'secret-meet',
  title: 'Secret Meet',
  visibility: 'unlisted',
});

export const UNLISTED_TOKEN = 'tok_9';

export function occurrence(overrides: Record<string, unknown> = {}) {
  return {
    id: '44444444-4444-4444-8444-444444444444',
    event: eventSummary(),
    starts_at: '2026-10-24T14:30:00Z',
    ends_at: '2026-10-24T17:00:00Z',
    timezone: 'America/Los_Angeles',
    status: 'scheduled',
    override_note: null,
    overridden_at: null,
    going_count: 12,
    interested_count: 3,
    check_in_count: 0,
    going_preview: [],
    viewer: { rsvp: null, checked_in: false },
    ...overrides,
  };
}

export const FEED = {
  sections: [
    {
      kind: 'this_weekend',
      title: 'This weekend',
      items: [eventSummary()],
      more: null,
    },
    {
      kind: 'next_week',
      title: 'Next week',
      items: [eventSummary({ id: 'e2', slug: 'fontana-sunday', title: 'Fontana Sunday' })],
      more: null,
    },
  ],
};

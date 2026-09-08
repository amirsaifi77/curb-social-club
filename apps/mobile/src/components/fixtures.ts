import type { ClubSummary, EventSummary, SponsorSummary } from '@curb/api-client';

// Shapes straight from the OpenAPI types, so a card test fails when the
// contract moves rather than when a hand-written stub drifts.
export function eventSummary(overrides: Partial<EventSummary> = {}): EventSummary {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    slug: 'lido-saturday',
    title: 'Lido Saturday',
    cover_url: null,
    cover_blurhash: null,
    tags: ['all'],
    recurring: true,
    rrule_text: 'Every Saturday',
    host: {
      type: 'club',
      id: '22222222-2222-4222-8222-222222222222',
      slug: 'back-bay-air-cooled',
      name: 'Back Bay Air-Cooled',
      avatar_url: null,
      verified: false,
      kind: null,
    },
    venue: {
      id: '33333333-3333-4333-8333-333333333333',
      name: 'Lido Marina Village',
      city: 'Newport Beach',
      location: { lat: 33.62, lng: -117.93 },
    },
    next_occurrence: {
      id: '44444444-4444-4444-8444-444444444444',
      starts_at: '2026-10-24T14:30:00Z',
      ends_at: '2026-10-24T16:30:00Z',
      timezone: 'America/Los_Angeles',
      going_count: 0,
      status: 'scheduled',
    },
    distance_m: 4828,
    source: { type: 'instagram', url: 'https://www.instagram.com/p/example/' },
    claimed: false,
    cadence: 'weekly',
    stale: true,
    last_confirmed_at: '2026-07-12T19:00:00Z',
    sponsors_preview: [
      {
        id: '55555555-5555-4555-8555-555555555555',
        slug: 'bear-coast',
        name: 'Bear Coast Coffee',
        logo_url: 'https://example.com/bear.png',
        role: 'coffee',
      },
      {
        id: '66666666-6666-4666-8666-666666666666',
        slug: 'apex-detail',
        name: 'Apex Detail',
        logo_url: 'https://example.com/apex.png',
        role: 'partner',
      },
    ],
    ...overrides,
  };
}

export function clubSummary(overrides: Partial<ClubSummary> = {}): ClubSummary {
  return {
    id: '77777777-7777-4777-8777-777777777777',
    slug: 'back-bay-air-cooled',
    name: 'Back Bay Air-Cooled',
    avatar_url: null,
    verified: true,
    home_label: 'Newport Beach, CA',
    members_count: 12,
    followers_count: 30,
    join_policy: 'open',
    distance_m: 3000,
    role: null,
    ...overrides,
  };
}

export function sponsorSummary(overrides: Partial<SponsorSummary> = {}): SponsorSummary {
  return {
    id: '88888888-8888-4888-8888-888888888888',
    slug: 'bear-coast',
    name: 'Bear Coast Coffee',
    kind: 'vendor',
    logo_url: null,
    verified: false,
    tagline: 'Pour-over from the cart',
    followers_count: 8,
    home_label: 'Newport Beach, CA',
    distance_m: 3200,
    ...overrides,
  };
}

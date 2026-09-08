// Query and mutation keys shared by web and mobile so both caches agree on
// what a resource is called (docs/mobile-liquid-glass.md, Data layer).
export const queryKeys = {
  all: ['curb'] as const,
  health: () => ['curb', 'health'] as const,
  me: () => ['curb', 'me'] as const,
  device: (anonymousId: string) => ['curb', 'devices', anonymousId] as const,
  events: (query: Record<string, unknown> = {}) => ['curb', 'events', query] as const,
  eventsMap: (query: Record<string, unknown>) => ['curb', 'events', 'map', query] as const,
  event: (slug: string) => ['curb', 'events', slug] as const,
  eventOccurrences: (eventId: string) => ['curb', 'events', eventId, 'occurrences'] as const,
  occurrence: (id: string) => ['curb', 'occurrences', id] as const,
  clubs: (query: Record<string, unknown> = {}) => ['curb', 'clubs', query] as const,
  club: (slug: string) => ['curb', 'clubs', slug] as const,
  clubEvents: (slug: string, query: Record<string, unknown> = {}) =>
    ['curb', 'clubs', slug, 'events', query] as const,
  clubMembers: (slug: string, query: Record<string, unknown> = {}) =>
    ['curb', 'clubs', slug, 'members', query] as const,
  sponsors: (query: Record<string, unknown> = {}) => ['curb', 'sponsors', query] as const,
  sponsor: (slug: string) => ['curb', 'sponsors', slug] as const,
  sponsorEvents: (slug: string, query: Record<string, unknown> = {}) =>
    ['curb', 'sponsors', slug, 'events', query] as const,
  user: (handle: string) => ['curb', 'users', handle] as const,
  userEvents: (handle: string, query: Record<string, unknown> = {}) =>
    ['curb', 'users', handle, 'events', query] as const,
  userClubs: (handle: string) => ['curb', 'users', handle, 'clubs'] as const,
  feed: (query: Record<string, unknown> = {}) => ['curb', 'feed', query] as const,
  venueSearch: (query: Record<string, unknown>) => ['curb', 'venues', 'search', query] as const,
  sitemap: () => ['curb', 'sitemap'] as const,
};

export const mutationKeys = {
  signInWithApple: ['curb', 'auth', 'apple'] as const,
  signInWithGoogle: ['curb', 'auth', 'google'] as const,
  signOut: ['curb', 'auth', 'sign-out'] as const,
  updateMe: ['curb', 'me', 'update'] as const,
  deleteAccount: ['curb', 'me', 'delete'] as const,
  registerDevice: ['curb', 'devices', 'register'] as const,
  updateDevice: ['curb', 'devices', 'update'] as const,
  confirmEvent: ['curb', 'events', 'confirm'] as const,
  joinClub: ['curb', 'clubs', 'join'] as const,
  updateSponsor: ['curb', 'sponsors', 'update'] as const,
};

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
};

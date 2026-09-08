// discovery.md Copy, S05 rows, word for word; the group titles come from
// clubs.md and sponsors.md ("Search group title").
export const SEARCH_COPY = {
  placeholder: 'Search meets, clubs, places',
  recentsHeader: 'Recent',
  groupEvents: 'Events',
  groupClubs: 'Clubs',
  groupSponsors: 'Sponsors',
  groupPlaces: 'Places',
  searchEverywhere: 'Search everywhere',
  addAMeet: 'Add a meet',
  offline: 'Searching saved results only.',
  error: "Couldn't run that search.",
  errorAction: 'Try again',
  loading: 'Searching.',
} as const;

// R-21, with the query in it. The radius is the one the search uses.
export function noResults(query: string): string {
  return `Nothing for "${query}" within 50 miles. Try a city, a host, or a day.`;
}

// R-20: Events, Clubs, Sponsors, Places, in that order. Sponsors after
// Clubs is sponsors.md R-17; Spots joins after Places in Phase 4.
export const GROUP_ORDER = ['events', 'clubs', 'sponsors', 'places'] as const;

export type GroupKey = (typeof GROUP_ORDER)[number];

export const GROUP_TITLES: Record<GroupKey, string> = {
  events: SEARCH_COPY.groupEvents,
  clubs: SEARCH_COPY.groupClubs,
  sponsors: SEARCH_COPY.groupSponsors,
  places: SEARCH_COPY.groupPlaces,
};

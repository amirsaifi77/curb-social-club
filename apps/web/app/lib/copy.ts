// docs/specs/web.md Copy, word for word, plus the rows W03 borrows from
// event-detail-and-rsvp.md and events-and-occurrences.md, which own the
// strings S08 and W03 share.

export const WEB_COPY = {
  siteTitleSuffix: 'curb',
  homeHeadline: 'This weekend, within 20 miles.',
  homeCityPicker: 'Pick a city',
  homeNearMe: 'Near me',
  homeEmpty: 'Nothing listed near here yet. Pick a city or get the app to add one.',
  // The three section titles come from the feed's own `title` field, so
  // the API is the one place they are written (discovery.md R-5).
  searchPlaceholder: 'Search meets, clubs, places',
  // web.md names no empty line for W02 without a query. W01's sentence
  // offers a city picker that W02 also has, so it is the same offer without
  // the half that belongs to the home page.
  listEmpty: 'Nothing listed here yet. Try another city, or get the app to add one.',
  rsvp: "I'm going",
  rsvpHelper: "Opens curb. Get it on the App Store if you don't have it.",
  calendar: 'Add to calendar',
  directions: 'Directions',
  share: 'Copy link',
  shareDone: 'Link copied',
  unclaimed: 'Unclaimed. Are you the host? Claim it in the app.',
  photosPlaceholder: 'Photos go here after the meet.',
  // event-detail-and-rsvp.md Copy, "S08 comments": R-7 asks W03 for the
  // photos and comments placeholders both, and web.md names only the first.
  commentsPlaceholder: 'Comments open soon. Ask the host on their page for now.',
  sourceAction: 'Open the original',
  goingZero: "Nobody has said they're going yet.",
  getTheApp: 'Get the app',
  // web.md Copy, the W05 rows.
  mapLoading: 'Loading the map.',
  mapTruncated: 'Zoom in to see all meets here.',
  mapEmpty: 'No meets here. Zoom out, or add the one you know about in the app.',
  mapError: "Couldn't load this area.",
  notFoundHeadline: 'Not found.',
  // The colon promises the nearby cards, which land with 1.17 (R-21).
  notFoundBody: "That page isn't here. Nearby this weekend:",
  goneHeadline: 'This meet is no longer listed.',
  goneNearby: 'Nearby this weekend',
} as const;

// clubs.md, sponsors.md and web.md Copy, for W06 to W09.
export const HOST_COPY = {
  clubVerified: 'Verified club',
  sponsorVerified: 'Verified',
  upcoming: 'Upcoming',
  upcomingEmpty: 'No meets listed yet. Follow to hear when one is.',
  seeAll: 'See all meets',
  members: 'Members',
  membersEmpty: 'No members listed yet.',
  // A hidden club or sponsor is a 404 on every public endpoint
  // (clubs.md R-5), so the web cannot tell one from a slug nobody ever
  // had, and the 404 page is the only honest answer. The "no longer
  // listed" lines belong to the mobile pages, which get the same 404 but
  // know which page they were on.
  sponsorFooter: 'Run this business? Email hello@curbsocial.club to update the page.',
  website: 'Website',
  // web.md Copy, "W08 and W09 follow": following is an app surface, so the
  // web says where to do it rather than offering a control that cannot.
  follow: 'Follow in the app',
  clubsTitle: 'Clubs in Southern California',
  clubsEmpty: 'No clubs listed yet.',
  profileHostBadge: 'Host',
  profileClubs: 'Clubs',
  profileClubsEmpty: 'Not in a club yet.',
  profileNotFound: "This profile isn't here.",
} as const;

// sponsors.md Copy, "W09 kind labels" and "S14 relation labels".
export const SPONSOR_KINDS: Record<string, string> = {
  brand: 'Sponsor',
  vendor: 'Vendor',
  venue: 'Venue partner',
};

export function sponsorKindLabel(kind: string): string {
  return SPONSOR_KINDS[kind] ?? SPONSOR_KINDS.brand;
}

export const RELATIONS: Record<string, string> = { host: 'Hosts', sponsor: 'Sponsors' };

export function relationLabel(relation: string): string {
  return RELATIONS[relation] ?? RELATIONS.sponsor;
}

// web.md Copy, "W08 members count". The web has no roles to name: the
// member list is a second request this page does not make.
export function membersLine(count: number): string {
  return `${count} ${count === 1 ? 'member' : 'members'}.`;
}

export function followersLine(count: number): string {
  return `${count} ${count === 1 ? 'follower' : 'followers'}`;
}

// profiles-and-follow.md Copy, "S11 counts, host".
export function hostCounts(followers: number, meets: number): string {
  return `${followersLine(followers)}. ${meets} ${meets === 1 ? 'meet' : 'meets'}.`;
}

// web.md Copy, "W12 title" and "W12 description (meta)".
export function cityTitle(city: string): string {
  return `cars and coffee in ${city}`;
}

export function cityDescription(city: string): string {
  return `Every car meet within 10 miles of ${city} this weekend, with times, lots, and hosts.`;
}

export function cityEmpty(city: string): string {
  return `Nothing listed in ${city} this weekend. Try a nearby city.`;
}

// web.md Copy: "Nothing for "{query}". Try a city, a host, or a day."
export function noResults(query: string): string {
  return `Nothing for "${query}". Try a city, a host, or a day.`;
}

// web.md Copy, "W03 last confirmed": the same sentence S08 shows, without
// the trailing period the card chip has.
export function lastConfirmed(date: string): string {
  return `Last confirmed ${date}`;
}

// web.md Copy, "W03 cancelled banner". events-and-occurrences.md writes the
// row as "Cancelled this week. Host note: {override_note}", and a host who
// closes their own sentence should not get two periods.
export function cancelledBanner(note: string | null): string {
  if (!note) return 'Cancelled this week.';
  const trimmed = note.trim();
  if (!trimmed) return 'Cancelled this week.';
  const closed = /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
  return `Cancelled this week. Host note: ${closed}`;
}

// web.md Copy, "W03 source card".
export function sourceCard(source: string, handle: string | null): string {
  return handle
    ? `Originally posted on ${source} by ${handle}.`
    : `Originally posted on ${source}.`;
}

// event-detail-and-rsvp.md Copy, "S08 going counts". The Event payload
// carries no interested count, so W03 shows the half it has.
export function goingCounts(going: number): string {
  // event-detail-and-rsvp.md Copy: a meet nobody has answered yet gets its
  // own sentence rather than a zero.
  return going === 0 ? WEB_COPY.goingZero : `${going} going.`;
}

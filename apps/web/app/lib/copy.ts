// docs/specs/web.md Copy, word for word, plus the rows W03 borrows from
// event-detail-and-rsvp.md and events-and-occurrences.md, which own the
// strings S08 and W03 share.

export const WEB_COPY = {
  siteTitleSuffix: 'curb',
  homeHeadline: 'This weekend, within 20 miles.',
  homeCityPicker: 'Pick a city',
  homeNearMe: 'Near me',
  homeEmpty: 'Nothing listed near here yet. Pick a city or get the app to add one.',
  sectionTitles: { this_weekend: 'This weekend', next_week: 'Next week', later: 'Later' },
  searchPlaceholder: 'Search meets, clubs, places',
  rsvp: "I'm going",
  rsvpHelper: "Opens curb. Get it on the App Store if you don't have it.",
  calendar: 'Add to calendar',
  directions: 'Directions',
  share: 'Copy link',
  shareDone: 'Link copied',
  unclaimed: 'Unclaimed. Are you the host? Claim it in the app.',
  photosPlaceholder: 'Photos go here after the meet.',
  getTheApp: 'Get the app',
  notFoundHeadline: 'Not found.',
  notFoundBody: "That page isn't here. Nearby this weekend:",
  goneHeadline: 'This meet is no longer listed.',
  goneNearby: 'Nearby this weekend',
} as const;

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
  return `${going} going.`;
}

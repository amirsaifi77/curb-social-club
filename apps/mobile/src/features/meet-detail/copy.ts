// docs/specs/event-detail-and-rsvp.md Copy, S08 rows, word for word.
export const DETAIL_COPY = {
  nextDatesHeader: 'Next dates',
  addToCalendar: 'Add to calendar',
  calendarDenied: 'Calendar access is off. Turn it on in Settings to add this meet.',
  directions: 'Directions',
  hostClaimed: 'Claimed',
  hostUnclaimed: 'Unclaimed. Are you the host? Claim this meet.',
  hostClaimPending: 'Claim under review',
  sponsorsHeader: 'Sponsors',
  goingZero: "Nobody has said they're going yet.",
  aboutHeader: 'About',
  sourceAction: 'Open the original',
  photosUpcoming: 'Photos go here after the meet.',
  photosPast: 'No photos from this one yet. Were you there?',
  comments: 'Comments open soon. Ask the host on their page for now.',
  noLongerListed: 'This meet is no longer listed.',
  nearbyHeader: 'Nearby this weekend',
  error: "Couldn't load this meet.",
  errorAction: 'Try again',
  offline: 'Showing a saved copy.',
  share: 'Share',
  occurrenceEnded: 'Ended',
} as const;

// docs/specs/events-and-occurrences.md Copy: this spec supplies the dormant
// and announced lines that S08 renders, so they live beside the rest.
export const EVENT_COPY = {
  announcedNoDates: 'No dates listed yet. Follow to hear when the host posts one.',
} as const;

// The dormant line names the date it was last confirmed. A meet can decay
// off `published_at` instead (events-and-occurrences.md R-26), and then
// `last_confirmed_at` is null and there is no date to name: it has never
// been confirmed, which is what that line says.
export function dormantLine(date: string | null): string {
  const opening = date ? `Not confirmed since ${date}.` : 'Never confirmed.';
  return `${opening} Are you the host? Confirm it and it comes back.`;
}

// R-15: the role label for each sponsorship.
export const SPONSOR_ROLES: Record<string, string> = {
  presented_by: 'Presented by',
  coffee: 'Coffee by',
  vendor: 'Vendor',
  partner: 'Partner',
};

// R-19 and the Copy table: the banner carries the host's note when there is
// one, and stands alone when there is not.
export function cancelledBanner(note: string | null): string {
  if (!note) return 'Cancelled this week.';
  const trimmed = note.trim();
  if (!trimmed) return 'Cancelled this week.';
  // The Copy row reads "Host note: rain." with the sentence closed, but a
  // host who closes their own sentence should not get "rain..".
  const closed = /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
  return `Cancelled this week. Host note: ${closed}`;
}

// The Copy row reads "Every Saturday, 7:30 to 10 am": the cadence the API
// describes, then the window it keeps. An announced series has no dates to
// read a window off, so it is the cadence alone.
export function recurringLine(rruleText: string, range: string | null): string {
  return range ? `${rruleText}, ${range}` : rruleText;
}

// R-18: shown whenever the last confirmation is older than 30 days.
export function lastConfirmed(date: string): string {
  return `Last confirmed ${date}`;
}

// R-19's source card.
export function sourceCard(source: string, handle: string | null): string {
  return handle
    ? `Originally posted on ${source} by ${handle}.`
    : `Originally posted on ${source}.`;
}

// R-14: an imported meet names the account it was listed from.
export function externalHost(name: string): string {
  return `Listed from a post by ${name}`;
}

// R-16 is Phase 2, but the counts line is Phase 1. The Copy line reads
// "42 going. 8 interested.", and the detail payload carries no interested
// count, so Phase 1 shows the half it has rather than a hardcoded zero.
export function goingCounts(going: number, interested: number | null): string {
  return interested === null ? `${going} going.` : `${going} going. ${interested} interested.`;
}

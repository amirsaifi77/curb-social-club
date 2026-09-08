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
  return note ? `Cancelled this week. Host note: ${note}.` : 'Cancelled this week.';
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

// R-16 is Phase 2, but the counts line is Phase 1.
export function goingCounts(going: number, interested: number): string {
  return `${going} going. ${interested} interested.`;
}

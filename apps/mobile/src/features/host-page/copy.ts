// The three host pages share one layout, so their Copy tables sit together:
// docs/specs/clubs.md (S12, S13), docs/specs/sponsors.md (S14), and
// docs/specs/profiles-and-follow.md (S11), word for word.

export const CLUB_COPY = {
  verified: 'Verified club',
  upcomingHeader: 'Upcoming',
  upcomingEmpty: 'No meets listed yet. Follow to hear when one is.',
  seeAll: 'See all meets',
  membersHeader: 'Members',
  membersEmpty: 'No members listed yet.',
  hidden: 'This club is no longer listed.',
  joinOpen: 'Open to join',
  joinInvite: 'By invitation',
} as const;

export const SPONSOR_COPY = {
  verified: 'Verified',
  upcomingHeader: 'Upcoming',
  upcomingEmpty: 'No meets listed yet. Follow to hear when one is.',
  website: 'Website',
  seeAll: 'See all meets',
  hidden: 'This sponsor is no longer listed.',
  footer: 'Run this business? Email hello@curbsocial.club to update the page.',
  error: "Couldn't load this page.",
  errorAction: 'Try again',
} as const;

export const PROFILE_COPY = {
  hostBadge: 'Host',
  clubsHeader: 'Clubs',
  clubsEmpty: 'Not in a club yet.',
  // The profiles Copy table names no header for the meets a host runs and
  // no line for a host with none. S11 borrows the header the other two
  // host pages already use and shows nothing when there are no meets,
  // rather than writing a sentence the spec did not.
  upcomingHeader: 'Upcoming',
  notFound: "This profile isn't here.",
  blocked: 'Nothing to show here.',
} as const;

// The states every host page shares (docs/screens.md standard states).
// Only sponsors.md writes the error line out; clubs.md and
// profiles-and-follow.md have no error row, so all three pages use the one
// string rather than three near-copies of it.
export const HOST_PAGE_COPY = {
  offline: 'Showing a saved copy.',
  loading: 'Loading this page',
  error: SPONSOR_COPY.error,
  errorAction: SPONSOR_COPY.errorAction,
} as const;

// sponsors.md Copy, "Kind label": the only thing `kind` changes.
export const SPONSOR_KIND_LABELS: Record<string, string> = {
  brand: 'Sponsor',
  vendor: 'Vendor',
  venue: 'Venue partner',
};

export function sponsorKindLabel(kind: string): string {
  return SPONSOR_KIND_LABELS[kind] ?? SPONSOR_KIND_LABELS.brand;
}

// sponsors.md Copy, "S14 relation labels": which way a meet is attached.
export const RELATION_LABELS: Record<string, string> = {
  host: 'Hosts',
  sponsor: 'Sponsors',
};

export function relationLabel(relation: string): string {
  return RELATION_LABELS[relation] ?? RELATION_LABELS.sponsor;
}

// sponsors.md Copy, "S14 followers": "120 followers".
export function followersLine(count: number): string {
  return `${count} ${count === 1 ? 'follower' : 'followers'}`;
}

// profiles-and-follow.md Copy, "S11 counts, host": "128 followers. 3 meets."
// Only a host has this line at all (R-17), and only their own profile ever
// shows a following count, which Phase 1 does not render.
export function hostCounts(followers: number, meets: number): string {
  return `${followersLine(followers)}. ${meets} ${meets === 1 ? 'meet' : 'meets'}.`;
}

// clubs.md Copy, "S12 members row": "24 members. Owner and two admins."
//
// The Club payload carries `members_count` but no role counts, so the
// leadership sentence is counted off the members page the row already
// fetched. When that page is not the whole club the count would be a guess,
// so the row is the member count alone rather than a wrong sentence.
const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight'];

export function membersRow(
  count: number,
  leadership: { owner: boolean; admins: number } | null,
): string {
  const members = `${count} ${count === 1 ? 'member' : 'members'}.`;
  if (!leadership) return members;
  const parts: string[] = [];
  if (leadership.owner) parts.push('Owner');
  if (leadership.admins === 1) parts.push('one admin');
  else if (leadership.admins > 1) parts.push(`${numberWord(leadership.admins)} admins`);
  if (parts.length === 0) return members;
  return `${members} ${parts.join(' and ')}.`;
}

function numberWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

// The leadership half of the row, counted off the member rows the page
// already has. The app account is skipped: clubs.md Risks says a seeded
// club shows no Owner label, and counting it would put one back in words.
export function leadershipOf(
  members: readonly { role?: string | null; handle: string }[],
  complete: boolean,
): { owner: boolean; admins: number } | null {
  if (!complete) return null;
  let owner = false;
  let admins = 0;
  for (const member of members) {
    if (member.handle === APP_ACCOUNT_HANDLE) continue;
    if (member.role === 'owner') owner = true;
    if (member.role === 'admin') admins += 1;
  }
  return { owner, admins };
}

// clubs.md S13 and profiles-and-follow.md Copy: the role labels.
export const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
};

// clubs.md Risks: seeded clubs carry the app account as owner until a claim,
// so no Owner label is drawn for that account, on the club page or on the
// account's own profile. It is never a real person and labelling it invents
// an organizer.
export const APP_ACCOUNT_HANDLE = 'curb';

export function roleLabel(role: string | null | undefined, handle: string): string | null {
  if (handle === APP_ACCOUNT_HANDLE) return null;
  if (!role) return null;
  return ROLE_LABELS[role] ?? null;
}

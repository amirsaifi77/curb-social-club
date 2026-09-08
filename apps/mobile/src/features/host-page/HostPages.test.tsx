// Registers the Unistyles themes before the pages' StyleSheet.create runs.
import '@/lib/unistyles';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { Linking } from 'react-native';

import { CLUB_COPY, FILTERED_LIST_COPY, PROFILE_COPY, SPONSOR_COPY } from './copy';
import { SOCIAL_ICON_SIZE } from './SocialsRow';
// The screens live under app/; a test file there would be picked up by
// expo-router's require.context and shipped as a route.
import ClubScreen from '../../../app/clubs/[slug]';
import ClubMembersScreen from '../../../app/clubs/[slug]/members';
import FilteredMeetsScreen from '../../../app/meets/index';
import SponsorScreen from '../../../app/sponsors/[slug]';
import ProfileScreen from '../../../app/u/[handle]';

import { clubDetail, clubMember, profile, sponsorDetail } from '@/components/fixtures';

const mockClub = jest.fn<(...args: unknown[]) => unknown>();
const mockClubMembers = jest.fn<(...args: unknown[]) => unknown>();
const mockClubMemberPages = jest.fn<(...args: unknown[]) => unknown>();
const mockSponsor = jest.fn<(...args: unknown[]) => unknown>();
const mockProfile = jest.fn<(...args: unknown[]) => unknown>();
const mockProfileClubs = jest.fn<(...args: unknown[]) => unknown>();
const mockProfileEvents = jest.fn<(...args: unknown[]) => unknown>();
const mockEventsPages = jest.fn<(...args: unknown[]) => unknown>();

// Only the hooks are doubles; the rest of the module stays real, so the
// pages read errors with the readers the app ships.
// The doubles pass their arguments through. A hook double that drops them
// cannot tell a filtered request from an unfiltered one, so the filter
// behind "See all meets" could be deleted with the suite still green.
jest.mock('@curb/api-client', () => ({
  ...(jest.requireActual('@curb/api-client') as object),
  useClub: (...args: unknown[]) => mockClub(...args),
  useClubMembers: (...args: unknown[]) => mockClubMembers(...args),
  useClubMembersPages: (...args: unknown[]) => mockClubMemberPages(...args),
  useSponsor: (...args: unknown[]) => mockSponsor(...args),
  useProfile: (...args: unknown[]) => mockProfile(...args),
  useProfileClubs: (...args: unknown[]) => mockProfileClubs(...args),
  useProfileEvents: (...args: unknown[]) => mockProfileEvents(...args),
  useEventsPages: (...args: unknown[]) => mockEventsPages(...args),
}));

// jest.setup.js returns {} from useLocalSearchParams for the whole app, so
// a screen that reads a route param sees nothing unless a test says so.
function withParams<T>(params: Record<string, string>, body: () => Promise<T>): Promise<T> {
  const router = jest.requireMock('expo-router') as { useLocalSearchParams: unknown };
  const original = router.useLocalSearchParams;
  router.useLocalSearchParams = () => params;
  return body().finally(() => {
    router.useLocalSearchParams = original;
  });
}

jest.mock('@/lib/auth', () => ({ auth: { client: {} } }));

const mockOpenBrowser = jest.fn(async (_url: string) => ({}));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: (url: string) => mockOpenBrowser(url) }));

function ok(data: unknown, overrides: Record<string, unknown> = {}) {
  return { data, isError: false, error: null, refetch: jest.fn(), ...overrides };
}

function page(rows: unknown[], nextCursor: string | null = null) {
  return ok({ data: rows, meta: { next_cursor: nextCursor, total: null } });
}

function pages(rows: unknown[], nextCursor: string | null = null) {
  return {
    ...ok({ pages: [{ data: rows, meta: { next_cursor: nextCursor, total: null } }] }),
    hasNextPage: nextCursor !== null,
    isFetchingNextPage: false,
    fetchNextPage: jest.fn(),
  };
}

function apiError(status: number) {
  return Object.assign(new Error('Not found'), { status, details: null, code: 'not_found' });
}

beforeEach(() => {
  mockClub.mockReturnValue(ok(clubDetail()));
  mockClubMembers.mockReturnValue(page([clubMember()]));
  mockClubMemberPages.mockReturnValue(pages([clubMember()]));
  mockSponsor.mockReturnValue(ok(sponsorDetail()));
  mockProfile.mockReturnValue(ok(profile()));
  mockProfileClubs.mockReturnValue(ok([]));
  mockProfileEvents.mockReturnValue(page([]));
  mockEventsPages.mockReturnValue(pages([]));
  mockOpenBrowser.mockClear();
  (globalThis as { __linkNavigations?: jest.Mock }).__linkNavigations?.mockClear();
});

// docs/specs/clubs.md AC-10, R-15, R-16.
describe('S12 club page', () => {
  it('AC-10: the club opens on its own name, with the page S12 describes', async () => {
    await render(<ClubScreen />);

    // In the header, not merely somewhere: the club also names itself on
    // the host chip of every meet card below.
    expect(screen.getByRole('header', { name: 'Back Bay Air-Cooled' })).toBeTruthy();
    expect(screen.getByText(CLUB_COPY.verified)).toBeTruthy();
    expect(screen.getByText('Newport Beach, CA')).toBeTruthy();
    expect(screen.getByText('Air-cooled cars and bad coffee, every other Sunday.')).toBeTruthy();
    expect(screen.getByText('30 followers')).toBeTruthy();
    expect(screen.getByText('Lido Saturday')).toBeTruthy();
  });

  it('R-15: the members row counts the club and names who runs it', async () => {
    mockClubMembers.mockReturnValue(
      page([
        clubMember({ role: 'owner', handle: 'amir' }),
        clubMember({ id: 'm2', role: 'admin', handle: 'dana', display_name: 'Dana' }),
        clubMember({ id: 'm3', role: 'admin', handle: 'sam', display_name: 'Sam' }),
      ]),
    );
    await render(<ClubScreen />);

    expect(screen.getByText('12 members. Owner and two admins.')).toBeTruthy();
  });

  it('R-15: a seeded club with admins still reads as a sentence', async () => {
    // Every club at launch is owned by the app account, which carries no
    // label, so the sentence starts at the admins rather than at a
    // lowercase fragment the Copy row's own example never has to be.
    mockClubMembers.mockReturnValue(
      page([
        clubMember({ role: 'owner', handle: 'curb', display_name: 'curb' }),
        clubMember({ id: 'm2', role: 'admin', handle: 'dana', display_name: 'Dana' }),
        clubMember({ id: 'm3', role: 'admin', handle: 'sam', display_name: 'Sam' }),
      ]),
    );
    await render(<ClubScreen />);

    expect(screen.getByText('12 members. Two admins.')).toBeTruthy();
  });

  it('R-15: one admin is one admin, not "1 admins"', async () => {
    mockClubMembers.mockReturnValue(
      page([clubMember({ id: 'm2', role: 'admin', handle: 'dana', display_name: 'Dana' })]),
    );
    await render(<ClubScreen />);

    expect(screen.getByText('12 members. One admin.')).toBeTruthy();
  });

  it('clubs Risks: a seeded club owned by the app account names no owner', async () => {
    mockClubMembers.mockReturnValue(page([clubMember({ role: 'owner', handle: 'curb' })]));
    await render(<ClubScreen />);

    // The app account is not a person, so the row is the count alone.
    expect(screen.getByText('12 members.')).toBeTruthy();
  });

  it('R-15: a page that is not the whole club counts members, not admins', async () => {
    // The Club payload has no role counts, so the sentence is built from
    // the member rows. With another page still to come it would be a guess.
    mockClubMembers.mockReturnValue(page([clubMember({ role: 'owner', handle: 'amir' })], 'cur.1'));
    await render(<ClubScreen />);

    expect(screen.getByText('12 members.')).toBeTruthy();
  });

  it('clubs R-15: See all meets opens the list filtered to this club', async () => {
    await render(<ClubScreen />);

    await act(async () => {
      fireEvent.press(screen.getByLabelText(CLUB_COPY.seeAll));
    });

    const navigations = (globalThis as { __linkNavigations?: jest.Mock }).__linkNavigations;
    expect(navigations?.mock.calls[0]?.[0]).toContain(
      '/meets?host=club:77777777-7777-4777-8777-777777777777',
    );
  });

  it('R-16: the members row is the way into S13', async () => {
    await render(<ClubScreen />);

    await act(async () => {
      fireEvent.press(screen.getByLabelText('12 members. Owner.'));
    });

    const navigations = (globalThis as { __linkNavigations?: jest.Mock }).__linkNavigations;
    expect(navigations?.mock.calls[0]?.[0]).toBe('/clubs/back-bay-air-cooled/members');
  });

  it('clubs R-15: the Phase 7 join policy label does not ship in Phase 1', async () => {
    await render(<ClubScreen />);

    // Both Copy rows are marked (7) and nothing in Phase 1 can act on one.
    expect(screen.queryByText('Open to join')).toBeNull();
    expect(screen.queryByText('By invitation')).toBeNull();
  });

  it('R-5: a hidden club is its own page, not an error with a retry', async () => {
    mockClub.mockReturnValue(ok(undefined, { isError: true, error: apiError(404) }));
    await render(<ClubScreen />);

    expect(screen.getByText(CLUB_COPY.hidden)).toBeTruthy();
    expect(screen.queryByText(SPONSOR_COPY.errorAction)).toBeNull();
  });

  it('R-15: an empty upcoming list says so in the club spec words', async () => {
    mockClub.mockReturnValue(ok(clubDetail({ upcoming_events: [] })));
    await render(<ClubScreen />);

    expect(screen.getByText(CLUB_COPY.upcomingEmpty)).toBeTruthy();
    // Nothing to see all of.
    expect(screen.queryByText(CLUB_COPY.seeAll)).toBeNull();
  });
});

describe('S13 club members', () => {
  it('R-16: each member carries the Owner or Admin label', async () => {
    mockClubMemberPages.mockReturnValue(
      pages([
        clubMember({ role: 'owner', handle: 'amir', display_name: 'Amir' }),
        clubMember({ id: 'm2', role: 'admin', handle: 'dana', display_name: 'Dana' }),
        clubMember({ id: 'm3', role: 'member', handle: 'sam', display_name: 'Sam' }),
      ]),
    );
    await render(<ClubMembersScreen />);

    expect(screen.getByText('Owner')).toBeTruthy();
    expect(screen.getByText('Admin')).toBeTruthy();
    expect(screen.getByText('Sam')).toBeTruthy();
  });

  it('clubs Risks: the app account carries no Owner label in the list either', async () => {
    // The count sentence already skips it; the per-member label is a second
    // place a seeded club would otherwise name an organizer nobody is.
    mockClubMemberPages.mockReturnValue(
      pages([
        clubMember({ role: 'owner', handle: 'curb', display_name: 'curb' }),
        clubMember({ id: 'm2', role: 'admin', handle: 'dana', display_name: 'Dana' }),
      ]),
    );
    await render(<ClubMembersScreen />);

    expect(screen.queryByText('Owner')).toBeNull();
    expect(screen.getByText('Admin')).toBeTruthy();
  });

  it('docs/screens.md: S13 loads as rows, not as a blank list', async () => {
    mockClubMemberPages.mockReturnValue({
      ...pages([]),
      data: undefined,
    });
    await render(<ClubMembersScreen />);

    expect(screen.getByLabelText('Loading this page')).toBeTruthy();
    expect(screen.queryByText(CLUB_COPY.membersEmpty)).toBeNull();
  });

  it('clubs Copy: an empty club says so', async () => {
    mockClubMemberPages.mockReturnValue(pages([]));
    await render(<ClubMembersScreen />);

    expect(screen.getByText(CLUB_COPY.membersEmpty)).toBeTruthy();
  });
});

// docs/specs/sponsors.md AC-13, AC-14, AC-18, R-15, R-18.
describe('S14 sponsor page', () => {
  it('AC-13: a vendor opens on its name and the Vendor label', async () => {
    await render(<SponsorScreen />);

    expect(screen.getByRole('header', { name: 'Bear Coast Coffee' })).toBeTruthy();
    expect(screen.getByText('Vendor')).toBeTruthy();
  });

  it('AC-13: the label follows `kind`, and nothing else does', async () => {
    mockSponsor.mockReturnValue(ok(sponsorDetail({ kind: 'venue' })));
    await render(<SponsorScreen />);

    expect(screen.getByText('Venue partner')).toBeTruthy();
    expect(screen.queryByText('Vendor')).toBeNull();
  });

  it('AC-14: every upcoming meet says whether the sponsor hosts or backs it', async () => {
    await render(<SponsorScreen />);

    expect(screen.getByText('Hosts')).toBeTruthy();
    expect(screen.getByText('Sponsors')).toBeTruthy();
  });

  it('AC-14: See all meets opens the list filtered to this sponsor', async () => {
    await render(<SponsorScreen />);

    await act(async () => {
      fireEvent.press(screen.getByLabelText(SPONSOR_COPY.seeAll));
    });

    const navigations = (globalThis as { __linkNavigations?: jest.Mock }).__linkNavigations;
    expect(navigations?.mock.calls[0]?.[0]).toContain(
      '/meets?sponsor=88888888-8888-4888-8888-888888888888',
    );
  });

  it('AC-18: the page offers no edit, only the address to write to', async () => {
    await render(<SponsorScreen />);

    expect(screen.getByText(SPONSOR_COPY.footer)).toBeTruthy();
    for (const label of ['Edit', 'Edit page', 'Manage', 'Claim']) {
      expect(screen.queryByText(label)).toBeNull();
    }
  });

  it('R-5: a hidden sponsor is its own page', async () => {
    mockSponsor.mockReturnValue(ok(undefined, { isError: true, error: apiError(404) }));
    await render(<SponsorScreen />);

    expect(screen.getByText(SPONSOR_COPY.hidden)).toBeTruthy();
  });

  it('R-15: the website opens in the in-app browser, not in Safari', async () => {
    await render(<SponsorScreen />);

    await act(async () => {
      fireEvent.press(screen.getByLabelText(SPONSOR_COPY.website));
    });

    expect(mockOpenBrowser).toHaveBeenCalledWith('https://bearcoastcoffee.com/');
  });
});

// docs/specs/profiles-and-follow.md AC-12, AC-13, R-17, R-18.
describe('S11 profile', () => {
  it('AC-12: a host opens on their name, handle, and follower count', async () => {
    await render(<ProfileScreen />);

    expect(screen.getByRole('header', { name: 'Amir' })).toBeTruthy();
    expect(screen.getByText('@amir')).toBeTruthy();
    expect(screen.getByText(PROFILE_COPY.hostBadge)).toBeTruthy();
    expect(screen.getByText('128 followers. 3 meets.')).toBeTruthy();
  });

  it('AC-12: a profile that is not a host shows no counts at all', async () => {
    mockProfile.mockReturnValue(ok(profile({ is_host: false })));
    await render(<ProfileScreen />);

    expect(screen.queryByText('128 followers. 3 meets.')).toBeNull();
    expect(screen.queryByText(PROFILE_COPY.hostBadge)).toBeNull();
  });

  it('AC-13: a social icon hands the link to iOS, so the app takes it', async () => {
    const openURL = jest.spyOn(Linking, 'openURL').mockResolvedValue(true as never);
    await render(<ProfileScreen />);

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Instagram'));
    });

    expect(openURL).toHaveBeenCalledWith('https://instagram.com/amir');
    openURL.mockRestore();
  });

  it('R-17: the social icons take their colour from the theme', async () => {
    await render(<ProfileScreen />);

    // Without a tintColor expo-symbols paints the system default, which
    // does not follow Marine Layer, Harbor or Olive and Ivory in dark.
    const icon = within(screen.getByLabelText('Instagram')).getByTestId('symbol');
    expect(icon.props.tintColor).toBeTruthy();
    expect(icon.props.size).toBe(SOCIAL_ICON_SIZE);
  });

  it('R-17: a clubs request that failed makes no claim about their clubs', async () => {
    // "Not in a club yet." is a fact about this person. A request that
    // errored knows nothing about their clubs.
    mockProfileClubs.mockReturnValue(ok(undefined, { isError: true, error: apiError(500) }));
    await render(<ProfileScreen />);

    expect(screen.queryByText(PROFILE_COPY.clubsEmpty)).toBeNull();
    expect(screen.queryByText(PROFILE_COPY.clubsHeader)).toBeNull();
  });

  it('AC-13: the website is the one link that stays inside the app', async () => {
    await render(<ProfileScreen />);

    await act(async () => {
      fireEvent.press(screen.getByLabelText('Website'));
    });

    expect(mockOpenBrowser).toHaveBeenCalledWith('https://example.com/');
  });

  it('R-17: the clubs section labels the role, and says so when there is none', async () => {
    mockProfileClubs.mockReturnValue(ok([]));
    await render(<ProfileScreen />);

    expect(screen.getByText(PROFILE_COPY.clubsEmpty)).toBeTruthy();
  });

  it('R-7: a handle nobody has is the not-found page', async () => {
    mockProfile.mockReturnValue(ok(undefined, { isError: true, error: apiError(404) }));
    await render(<ProfileScreen />);

    expect(screen.getByText(PROFILE_COPY.notFound)).toBeTruthy();
  });

  it('R-14: a blocked profile shows a name and the one line, and nothing else', async () => {
    mockProfile.mockReturnValue(
      ok(profile({ viewer: { following: false, blocked: true, is_self: false, reported: false } })),
    );
    await render(<ProfileScreen />);

    expect(screen.getByText(PROFILE_COPY.blocked)).toBeTruthy();
    expect(screen.queryByText(PROFILE_COPY.clubsHeader)).toBeNull();
    expect(screen.queryByLabelText('Instagram')).toBeNull();
  });
});

describe('S04b filtered by host', () => {
  it('AC-14: the list asks for this sponsor rather than for every meet', async () => {
    await withParams({ sponsor: '88888888-8888-4888-8888-888888888888' }, async () => {
      await render(<FilteredMeetsScreen />);
    });

    // Without this the route would render, and read, everyone's meets.
    expect(mockEventsPages).toHaveBeenCalledWith({
      sponsor: '88888888-8888-4888-8888-888888888888',
    });
  });

  it('clubs R-15: a club list asks by host, not by sponsor', async () => {
    await withParams({ host: 'club:77777777-7777-4777-8777-777777777777' }, async () => {
      await render(<FilteredMeetsScreen />);
    });

    expect(mockEventsPages).toHaveBeenCalledWith({
      host: 'club:77777777-7777-4777-8777-777777777777',
    });
  });

  it('AC-14: the list renders the meets the filter returned', async () => {
    mockEventsPages.mockReturnValue(pages([{ ...clubDetail().upcoming_events[0] }]));
    await render(<FilteredMeetsScreen />);

    expect(screen.getByText('Lido Saturday')).toBeTruthy();
  });

  it('a host with nothing upcoming says so, without pointing at a Follow control', async () => {
    await render(<FilteredMeetsScreen />);

    expect(screen.getByText(FILTERED_LIST_COPY.empty)).toBeTruthy();
  });
});

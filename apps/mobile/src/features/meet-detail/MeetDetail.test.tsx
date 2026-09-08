// Registers the Unistyles themes before the blocks' StyleSheet.create runs.
import '@/lib/unistyles';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { Share } from 'react-native';

import { DETAIL_COPY, EVENT_COPY, cancelledBanner, dormantLine } from './copy';
// The screen lives under app/; a test file there would be picked up by
// expo-router's require.context and shipped as a route.
import MeetDetailScreen from '../../../app/meets/[slug]';

import { eventSummary, sponsorSummary } from '@/components/fixtures';

const mockEvent = jest.fn<(slug: unknown, query?: unknown, options?: unknown) => unknown>();

jest.mock('@curb/api-client', () => ({
  useEvent: (slug: unknown, query?: unknown, options?: unknown) => mockEvent(slug, query, options),
}));

// The screen reads an error's status and details structurally, so the test
// does not need the real ApiError class across the mocked boundary.
function apiError(status: number, details: Record<string, unknown> | null) {
  return Object.assign(new Error('Gone'), { status, details, code: 'gone' });
}

jest.mock('@/lib/auth', () => ({ auth: { client: {} } }));
jest.mock('expo-web-browser', () => ({ openBrowserAsync: jest.fn(async () => ({})) }));

function detail(overrides: Record<string, unknown> = {}) {
  const summary = eventSummary();
  return {
    ...summary,
    description: 'Coffee is inside, parking is wherever there is room.',
    parking_note: 'lot behind the bakery',
    rrule: 'FREQ=WEEKLY;BYDAY=SA',
    dtstart: '2026-10-24T14:30:00Z',
    duration_minutes: 150,
    rsvp_mode: 'count_only',
    capacity: null,
    status: 'published',
    visibility: 'public',
    dormant: false,
    hidden: false,
    external_host_name: '@backbayaircooled',
    venue: {
      ...summary.venue,
      address_line1: '3434 Via Lido',
      address_line2: null,
      region: 'CA',
      postal_code: '92663',
      country: 'US',
      timezone: 'America/Los_Angeles',
    },
    upcoming_occurrences: [
      {
        id: 'occ-1',
        starts_at: '2026-10-24T14:30:00Z',
        ends_at: '2026-10-24T17:00:00Z',
        timezone: 'America/Los_Angeles',
        going_count: 0,
        status: 'scheduled',
        override_note: null,
      },
    ],
    sponsorships: [
      { sponsor: sponsorSummary(), role: 'coffee', note: 'Pour-over from the cart', position: 0 },
    ],
    viewer: {
      following: false,
      rsvp: null,
      can_edit: false,
      can_claim: true,
      claim_status: null,
      reported: false,
    },
    photos_count: 0,
    comments_count: 0,
    followers_count: 3,
    ...overrides,
  };
}

function wire(data: unknown, overrides: Record<string, unknown> = {}) {
  mockEvent.mockReturnValue({
    data,
    isError: false,
    error: null,
    refetch: jest.fn(),
    ...overrides,
  });
}

// docs/specs/event-detail-and-rsvp.md AC-9, AC-13, AC-15, AC-17; R-11, R-14,
// R-15, R-19, R-20.
describe('S08 meet detail', () => {
  beforeEach(() => wire(detail()));

  it('AC-9: the blocks render in R-11 order for an unclaimed, sponsored, imported meet', async () => {
    await render(<MeetDetailScreen />);

    // The title on the hero, then when, where, host, sponsors, going, about,
    // source, and the two placeholders.
    expect(screen.getByText('Lido Saturday')).toBeTruthy();
    expect(screen.getByText('Sat, Oct 24, 7:30 am')).toBeTruthy();
    // One occurrence, so no "Next dates" list above a single repeated row.
    expect(screen.queryByText(DETAIL_COPY.nextDatesHeader)).toBeNull();
    expect(screen.getByText('Lido Marina Village')).toBeTruthy();
    expect(screen.getByText('Parking: lot behind the bakery')).toBeTruthy();
    expect(screen.getByText(DETAIL_COPY.hostUnclaimed)).toBeTruthy();
    expect(screen.getByText('Listed from a post by @backbayaircooled')).toBeTruthy();
    expect(screen.getByText('Coffee by Bear Coast Coffee')).toBeTruthy();
    expect(screen.getByText(DETAIL_COPY.goingZero)).toBeTruthy();
    expect(screen.getByText(DETAIL_COPY.aboutHeader)).toBeTruthy();
    expect(
      screen.getByText('Originally posted on Instagram by @backbayaircooled.'),
    ).toBeTruthy();
    expect(screen.getByText(DETAIL_COPY.photosUpcoming)).toBeTruthy();
    expect(screen.getByText(DETAIL_COPY.comments)).toBeTruthy();
  });

  it('R-11: the sponsors block is absent rather than empty when there are none', async () => {
    wire(detail({ sponsorships: [] }));
    await render(<MeetDetailScreen />);

    expect(screen.queryByText(DETAIL_COPY.sponsorsHeader)).toBeNull();
  });

  it('R-14: a claimed meet says so instead of asking for a claim', async () => {
    wire(detail({ claimed: true }));
    await render(<MeetDetailScreen />);

    expect(screen.getByText(DETAIL_COPY.hostClaimed)).toBeTruthy();
    expect(screen.queryByText(DETAIL_COPY.hostUnclaimed)).toBeNull();
  });

  it('AC-13: a cancelled next occurrence shows the banner with the note', async () => {
    wire(
      detail({
        upcoming_occurrences: [
          {
            id: 'occ-1',
            starts_at: '2026-10-24T14:30:00Z',
            ends_at: '2026-10-24T17:00:00Z',
            timezone: 'America/Los_Angeles',
            going_count: 0,
            status: 'cancelled',
            override_note: 'rain',
          },
        ],
      }),
    );
    await render(<MeetDetailScreen />);

    expect(screen.getByText(cancelledBanner('rain'))).toBeTruthy();
  });

  it('R-19: a cancelled occurrence with no note still says it is cancelled', async () => {
    wire(
      detail({
        upcoming_occurrences: [
          {
            id: 'occ-1',
            starts_at: '2026-10-24T14:30:00Z',
            ends_at: '2026-10-24T17:00:00Z',
            timezone: 'America/Los_Angeles',
            going_count: 0,
            status: 'cancelled',
            override_note: null,
          },
        ],
      }),
    );
    await render(<MeetDetailScreen />);

    expect(screen.getByText('Cancelled this week.')).toBeTruthy();
  });

  it('AC-15: a 410 renders the no-longer-listed page with the nearby cards', async () => {
    const nearby = [eventSummary({ id: 'n1', title: 'Still on' })];
    wire(undefined, {
      isError: true,
      error: apiError(410, { nearby }),
    });
    await render(<MeetDetailScreen />);

    expect(screen.getByText(DETAIL_COPY.noLongerListed)).toBeTruthy();
    expect(screen.getByText(DETAIL_COPY.nearbyHeader)).toBeTruthy();
    expect(screen.getByText('Still on')).toBeTruthy();
    // Not the generic error state.
    expect(screen.queryByText(DETAIL_COPY.error)).toBeNull();
  });

  it('R-20: a 410 with nothing nearby is still the page, not an error', async () => {
    wire(undefined, { isError: true, error: apiError(410, null) });
    await render(<MeetDetailScreen />);

    expect(screen.getByText(DETAIL_COPY.noLongerListed)).toBeTruthy();
    expect(screen.queryByText(DETAIL_COPY.nearbyHeader)).toBeNull();
  });

  it('Screens S08: a failed refetch over a cached copy is a saved copy', async () => {
    wire(detail(), { isError: true, error: apiError(500, null) });
    await render(<MeetDetailScreen />);

    expect(screen.getByText(DETAIL_COPY.offline)).toBeTruthy();
    // The meet is still on screen, so this is not the error state.
    expect(screen.queryByText(DETAIL_COPY.error)).toBeNull();
    expect(screen.getByText('Lido Marina Village')).toBeTruthy();
  });

  it('a failure that is not a 410 is an error with a retry', async () => {
    const refetch = jest.fn();
    wire(undefined, {
      isError: true,
      error: apiError(500, null),
      refetch,
    });
    await render(<MeetDetailScreen />);

    expect(screen.getByText(DETAIL_COPY.error)).toBeTruthy();
    await act(async () => {
      fireEvent.press(screen.getByText(DETAIL_COPY.errorAction));
    });
    expect(refetch).toHaveBeenCalled();
  });

  it('R-12: several dates list the ones after the next, each opening S09', async () => {
    const occurrence = (id: string, starts: string) => ({
      id,
      starts_at: starts,
      ends_at: starts,
      timezone: 'America/Los_Angeles',
      going_count: 0,
      status: 'scheduled' as const,
      override_note: null,
    });
    wire(
      detail({
        upcoming_occurrences: [
          occurrence('occ-1', '2026-10-24T14:30:00Z'),
          occurrence('occ-2', '2026-10-31T14:30:00Z'),
          occurrence('occ-3', '2026-11-07T14:30:00Z'),
        ],
      }),
    );
    await render(<MeetDetailScreen />);

    expect(screen.getByText(DETAIL_COPY.nextDatesHeader)).toBeTruthy();
    // The next occurrence heads the block; the rows are the ones after it.
    expect(screen.getAllByText('Sat, Oct 24, 7:30 am')).toHaveLength(1);
    expect(screen.getByLabelText('Sat, Oct 31, 7:30 am')).toBeTruthy();
    // Same UTC instant, but November is PST rather than PDT, so the row
    // reads an hour earlier: the venue's clock, not a fixed offset.
    expect(screen.getByLabelText('Sat, Nov 7, 6:30 am')).toBeTruthy();
  });

  it('R-25: a deep link shows the layout as a skeleton before the fetch lands', async () => {
    wire(undefined, {});
    await render(<MeetDetailScreen />);

    // Never a spinner, and never an error before the request has answered.
    expect(screen.getByLabelText('Loading this meet')).toBeTruthy();
    expect(screen.queryByText(DETAIL_COPY.error)).toBeNull();
  });

  it('events spec Copy: an announced meet with no dates says so in its words', async () => {
    wire(detail({ upcoming_occurrences: [], cadence: 'announced' }));
    await render(<MeetDetailScreen />);

    expect(screen.getByText(EVENT_COPY.announcedNoDates)).toBeTruthy();
    // Nothing to add to a calendar, so nothing offers to.
    expect(screen.queryByText(DETAIL_COPY.addToCalendar)).toBeNull();
  });

  it('events spec Copy: a dormant meet names the date it was last confirmed', async () => {
    wire(detail({ dormant: true, last_confirmed_at: '2026-06-01T12:00:00Z' }));
    await render(<MeetDetailScreen />);

    expect(screen.getByText(dormantLine('Jun 1'))).toBeTruthy();
  });

  it('AC-17: sharing carries the canonical URL and the message from Copy', async () => {
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as never);
    await render(<MeetDetailScreen />);

    await act(async () => {
      fireEvent.press(screen.getByLabelText(DETAIL_COPY.share));
    });

    // One activity item: the message already ends with the canonical URL,
    // and passing it twice puts the link in the shared text twice.
    expect(share).toHaveBeenCalledWith({
      message: 'Lido Saturday, Sat, Oct 24, 7:30 am. https://curbsocial.club/meets/lido-saturday',
    });
    share.mockRestore();
  });

  it('AC-17: an unlisted meet shares the token that makes the link readable', async () => {
    const params = jest.requireMock('expo-router') as { useLocalSearchParams: unknown };
    params.useLocalSearchParams = () => ({ slug: 'secret-meet', token: 'tok_9' });
    const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' } as never);

    await render(<MeetDetailScreen />);
    await act(async () => {
      fireEvent.press(screen.getByLabelText(DETAIL_COPY.share));
    });

    const shared = share.mock.calls[0]?.[0] as { message: string };
    expect(shared.message).toContain('?token=tok_9');

    share.mockRestore();
    params.useLocalSearchParams = () => ({});
  });
});

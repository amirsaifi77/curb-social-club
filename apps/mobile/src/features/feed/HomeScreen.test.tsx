// Registers the Unistyles themes before the screen's StyleSheet.create runs.
import '@/lib/unistyles';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

// The screen itself lives under app/; a test file placed there would be
// picked up by expo-router's require.context and shipped as a route.
import HomeScreen from '../../../app/(tabs)/(home)/index';

import { clubSummary, eventSummary } from '@/components/fixtures';
import { EMPTY_HEADLINE, EMPTY_WIDENED, WIDEN_ACTION } from '@/features/feed/FeedEmpty';
import { clearBrowseArea, toBrowseArea } from '@/lib/browse-location';
import { resetBrowseAreaCache, setBrowseArea } from '@/lib/use-browse-location';

const mockFeed = jest.fn<(query: unknown, options?: unknown) => unknown>();

jest.mock('@curb/api-client', () => ({
  useFeed: (query: unknown, options?: unknown) => mockFeed(query, options),
}));

jest.mock('@/lib/auth', () => ({ auth: { client: {} } }));
jest.mock('@/features/onboarding/state', () => ({ hasOnboarded: () => true }));

function feedState(overrides: Record<string, unknown> = {}) {
  return {
    data: undefined,
    isLoading: false,
    isError: false,
    isRefetching: false,
    refetch: jest.fn(),
    ...overrides,
  };
}

const sections = [
  { kind: 'this_weekend', title: 'This weekend', items: [eventSummary()] },
  { kind: 'clubs_nearby', title: 'Clubs near you', items: [clubSummary()] },
];

// docs/specs/discovery.md AC-11, AC-12, R-12, R-14; docs/screens.md Standard
// states.
describe('S02 Home', () => {
  beforeEach(() => {
    clearBrowseArea();
    resetBrowseAreaCache();
    setBrowseArea(toBrowseArea(33.5427, -117.7854, 'Laguna Beach', 'city'));
  });

  it('asks for the chosen area at the 32 km default', async () => {
    mockFeed.mockReturnValue(feedState({ data: { sections } }));
    await render(<HomeScreen />);

    expect(mockFeed).toHaveBeenCalledWith(
      { near: '33.54,-117.79', radius_km: 32 },
      { enabled: true },
    );
    expect(await screen.findByText('This weekend')).toBeTruthy();
  });

  it('asks for nothing until S01 has committed an area', async () => {
    clearBrowseArea();
    resetBrowseAreaCache();
    mockFeed.mockReturnValue(feedState());
    await render(<HomeScreen />);

    expect(mockFeed).toHaveBeenCalledWith(expect.anything(), { enabled: false });
    // Waiting, not empty: the skeleton, never the widen state.
    expect(screen.getByLabelText('Loading meets')).toBeTruthy();
    expect(screen.queryByText(EMPTY_HEADLINE)).toBeNull();
  });

  it('loads behind a skeleton, not a spinner', async () => {
    mockFeed.mockReturnValue(feedState({ isLoading: true }));
    await render(<HomeScreen />);

    expect(screen.getByLabelText('Loading meets')).toBeTruthy();
  });

  it('AC-12: widening asks again at 80 km and keeps the after-widening copy', async () => {
    mockFeed.mockReturnValue(feedState({ data: { sections: [] } }));
    await render(<HomeScreen />);

    expect(screen.getByText(EMPTY_HEADLINE)).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByText(WIDEN_ACTION));
    });

    expect(mockFeed).toHaveBeenLastCalledWith(
      { near: '33.54,-117.79', radius_km: 80 },
      { enabled: true },
    );
    expect(screen.getByText(EMPTY_WIDENED)).toBeTruthy();
    expect(screen.queryByText(WIDEN_ACTION)).toBeNull();
  });

  it('R-14: an error with nothing cached is an error, with a retry', async () => {
    const refetch = jest.fn();
    mockFeed.mockReturnValue(feedState({ isError: true, refetch }));
    await render(<HomeScreen />);

    expect(screen.getByText("Couldn't load the feed.")).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByText('Try again'));
    });
    expect(refetch).toHaveBeenCalled();
  });

  it('R-14: an error with a cached feed is saved results, not an error', async () => {
    mockFeed.mockReturnValue(feedState({ isError: true, data: { sections } }));
    await render(<HomeScreen />);

    expect(await screen.findByText('Showing saved results.')).toBeTruthy();
    expect(screen.queryByText("Couldn't load the feed.")).toBeNull();
    expect(screen.getByText('This weekend')).toBeTruthy();
  });
});

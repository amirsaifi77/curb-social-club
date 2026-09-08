// Registers the Unistyles themes before the screen's StyleSheet.create runs.
import '@/lib/unistyles';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { GROUP_TITLES, SEARCH_COPY, noResults } from './copy';
import { clearRecents, rememberSearch } from './recents';
// The screen lives under app/; a test file there would be picked up by
// expo-router's require.context and shipped as a route.
import SearchScreen from '../../../app/search';

import { clubSummary, eventSummary, sponsorSummary } from '@/components/fixtures';
import { DEBOUNCE_MS } from '@/hooks/use-debounced-query';
import { clearBrowseArea, readBrowseArea, toBrowseArea } from '@/lib/browse-location';
import { resetBrowseAreaCache, setBrowseArea } from '@/lib/use-browse-location';

const mockEvents = jest.fn<(query: unknown, options?: unknown) => unknown>();
const mockClubs = jest.fn<(query: unknown, options?: unknown) => unknown>();
const mockSponsors = jest.fn<(query: unknown, options?: unknown) => unknown>();
const mockGeocode = jest.fn<() => Promise<{ latitude: number; longitude: number }[]>>(async () => []);

jest.mock('@curb/api-client', () => ({
  useSearchEvents: (q: unknown, o?: unknown) => mockEvents(q, o),
  useSearchClubs: (q: unknown, o?: unknown) => mockClubs(q, o),
  useSearchSponsors: (q: unknown, o?: unknown) => mockSponsors(q, o),
}));

jest.mock('expo-location', () => ({ geocodeAsync: () => mockGeocode() }));
jest.mock('@/lib/auth', () => ({ auth: { client: {} } }));

function state(data: unknown, overrides: Record<string, unknown>, enabled: boolean) {
  if (!enabled) {
    return { data: undefined, isLoading: false, isSuccess: false, isError: false, refetch: jest.fn() };
  }
  return { data, isLoading: false, isSuccess: true, isError: false, refetch: jest.fn(), ...overrides };
}

function wire(
  mock: jest.Mock<(query: unknown, options?: unknown) => unknown>,
  data: unknown,
  overrides: Record<string, unknown> = {},
) {
  mock.mockImplementation((_q, options) =>
    state(data, overrides, (options as { enabled?: boolean } | undefined)?.enabled ?? true),
  );
}

async function type(text: string) {
  await act(async () => {
    fireEvent.changeText(screen.getByLabelText(SEARCH_COPY.placeholder), text);
  });
  await act(async () => {
    jest.advanceTimersByTime(DEBOUNCE_MS);
  });
}

// docs/specs/discovery.md R-20, R-21, AC-20 to AC-22; sponsors.md AC-17.
describe('S05 Search', () => {
  beforeEach(() => {
    clearRecents();
    clearBrowseArea();
    resetBrowseAreaCache();
    setBrowseArea(toBrowseArea(33.62, -117.93, 'Coastal Orange County', 'default'));
    wire(mockEvents, { data: [], meta: {} });
    wire(mockClubs, []);
    wire(mockSponsors, []);
    mockGeocode.mockResolvedValue([]);
  });

  it('AC-20: recents first, then one request per group after the debounce', async () => {
    rememberSearch('lido');
    rememberSearch('corona');

    jest.useFakeTimers();
    try {
      await render(<SearchScreen />);

      // Nothing typed: the recents, most recent first.
      expect(screen.getByText(SEARCH_COPY.recentsHeader)).toBeTruthy();
      expect(screen.getByText('corona')).toBeTruthy();
      expect(mockEvents).toHaveBeenLastCalledWith(expect.anything(), { enabled: false });

      wire(mockEvents, { data: [eventSummary()], meta: {} });
      wire(mockClubs, [clubSummary()]);
      wire(mockSponsors, [sponsorSummary()]);
      await type('corona');

      for (const mock of [mockEvents, mockClubs, mockSponsors]) {
        expect(mock).toHaveBeenLastCalledWith(
          expect.objectContaining({ q: 'corona', near: '33.62,-117.93', radius_km: 80 }),
          { enabled: true },
        );
      }
    } finally {
      jest.useRealTimers();
    }
  });

  it('AC-20 and sponsors AC-17: the groups render in order, Sponsors after Clubs', async () => {
    wire(mockEvents, { data: [eventSummary()], meta: {} });
    wire(mockClubs, [clubSummary()]);
    wire(mockSponsors, [sponsorSummary()]);
    mockGeocode.mockResolvedValue([{ latitude: 33.46, longitude: -117.69 }]);

    jest.useFakeTimers();
    try {
      await render(<SearchScreen />);
      await type('lido');

      const headers = screen
        .getAllByRole('header')
        .map((node) => node.props.children as string)
        .filter((title) => Object.values(GROUP_TITLES).includes(title));

      expect(headers).toEqual([
        GROUP_TITLES.events,
        GROUP_TITLES.clubs,
        GROUP_TITLES.sponsors,
        GROUP_TITLES.places,
      ]);
    } finally {
      jest.useRealTimers();
    }
  });

  it('R-20: a group with nothing in it renders no title', async () => {
    wire(mockEvents, { data: [eventSummary()], meta: {} });

    jest.useFakeTimers();
    try {
      await render(<SearchScreen />);
      await type('lido');

      expect(screen.getByText(GROUP_TITLES.events)).toBeTruthy();
      expect(screen.queryByText(GROUP_TITLES.clubs)).toBeNull();
      expect(screen.queryByText(GROUP_TITLES.sponsors)).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('AC-21: nothing found offers both actions, and Search everywhere drops the near', async () => {
    jest.useFakeTimers();
    try {
      await render(<SearchScreen />);
      await type('zzzz');

      expect(screen.getByText(noResults('zzzz'))).toBeTruthy();

      await act(async () => {
        fireEvent.press(screen.getByText(SEARCH_COPY.searchEverywhere));
      });

      const query = mockEvents.mock.calls.at(-1)?.[0] as Record<string, unknown>;
      expect(query.q).toBe('zzzz');
      expect(query.near).toBeUndefined();
      expect(query.radius_km).toBeUndefined();
      // Offered once; after widening there is nowhere wider to go.
      expect(screen.queryByText(SEARCH_COPY.searchEverywhere)).toBeNull();
      expect(screen.getByText(SEARCH_COPY.addAMeet)).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });

  it('AC-22: picking a place moves the browse area and closes the screen', async () => {
    mockGeocode.mockResolvedValue([{ latitude: 33.4672, longitude: -117.6981 }]);

    jest.useFakeTimers();
    try {
      await render(<SearchScreen />);
      await type('Dana Point');

      await act(async () => {
        fireEvent.press(screen.getByText('Dana Point'));
      });

      // R-1: the place's coordinates go through the same rounding as every
      // other browse coordinate, because the map is about to move there.
      expect(readBrowseArea()).toMatchObject({ lat: 33.47, lng: -117.7, label: 'Dana Point' });
      expect(router.back).toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('AC-20: a search that returned something becomes a recent', async () => {
    wire(mockEvents, { data: [eventSummary()], meta: {} });

    jest.useFakeTimers();
    try {
      await render(<SearchScreen />);
      await type('corona');

      await act(async () => {
        fireEvent.changeText(screen.getByLabelText(SEARCH_COPY.placeholder), '');
      });

      expect(screen.getByText(SEARCH_COPY.recentsHeader)).toBeTruthy();
      expect(screen.getByText('corona')).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });

  it('Screens S05: a geocoder that cannot be reached is saved results, not an empty Places', async () => {
    wire(mockEvents, { data: [eventSummary()], meta: {} });
    mockGeocode.mockRejectedValue(new Error('offline'));

    jest.useFakeTimers();
    try {
      await render(<SearchScreen />);
      await type('Dana Point');

      expect(screen.getByText(SEARCH_COPY.offline)).toBeTruthy();
      // Not an empty group claiming the place does not exist.
      expect(screen.queryByText(GROUP_TITLES.places)).toBeNull();
      expect(screen.queryByText(SEARCH_COPY.error)).toBeNull();
    } finally {
      jest.useRealTimers();
    }
  });

  it('Screens S05: one group failing over rows that arrived is saved results', async () => {
    wire(mockEvents, { data: [eventSummary()], meta: {} });
    wire(mockClubs, undefined, { isError: true, isSuccess: false });

    jest.useFakeTimers();
    try {
      await render(<SearchScreen />);
      await type('corona');

      expect(screen.getByText(SEARCH_COPY.offline)).toBeTruthy();
      expect(screen.queryByText(SEARCH_COPY.error)).toBeNull();
      expect(screen.getByText(GROUP_TITLES.events)).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });

  it('Screens S05: every group failing is an error with a retry', async () => {
    const refetch = jest.fn();
    for (const mock of [mockEvents, mockClubs, mockSponsors]) {
      wire(mock, undefined, { isError: true, isSuccess: false, refetch });
    }

    jest.useFakeTimers();
    try {
      await render(<SearchScreen />);
      await type('corona');

      expect(screen.getByText(SEARCH_COPY.error)).toBeTruthy();
      await act(async () => {
        fireEvent.press(screen.getByText(SEARCH_COPY.errorAction));
      });
      expect(refetch).toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });
});

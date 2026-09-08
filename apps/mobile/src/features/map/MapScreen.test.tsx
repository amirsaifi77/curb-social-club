// Registers the Unistyles themes before the screen's StyleSheet.create runs.
import '@/lib/unistyles';

import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { act, fireEvent, render, screen } from '@testing-library/react-native';

import { MAP_COPY, peekLabel } from './copy';
import { SETTLE_MS } from './use-viewport';
// The screen lives under app/; a test file there would be picked up by
// expo-router's require.context and shipped as a route.
import MapScreen from '../../../app/(tabs)/map';

import { eventSummary } from '@/components/fixtures';
import { clearBrowseArea, toBrowseArea } from '@/lib/browse-location';
import { resetBrowseAreaCache, setBrowseArea } from '@/lib/use-browse-location';

const mockEventsMap = jest.fn<(query: unknown, options?: unknown) => unknown>();
const mockEvents = jest.fn<(query: unknown, options?: unknown) => unknown>();

jest.mock('@curb/api-client', () => ({
  useEventsMap: (query: unknown, options?: unknown) => mockEventsMap(query, options),
  useEvents: (query: unknown, options?: unknown) => mockEvents(query, options),
}));

jest.mock('@/lib/auth', () => ({ auth: { client: {} } }));

// react-native-maps and the sheet both reach for native views; the screen
// only cares about what it hands them.
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  const MapView = React.forwardRef((props: { children?: unknown }, ref: unknown) => {
    React.useImperativeHandle(ref, () => ({ animateToRegion: jest.fn() }));
    return React.createElement(View, { testID: 'map' }, props.children);
  });
  MapView.displayName = 'MapView';
  return {
    __esModule: true,
    default: MapView,
    Marker: ({ children, accessibilityLabel }: { children?: unknown; accessibilityLabel?: string }) =>
      React.createElement(View, { accessibilityLabel }, children),
    PROVIDER_DEFAULT: undefined,
  };
});

jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  const { FlatList, View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children }: { children?: unknown }) => React.createElement(View, null, children),
    BottomSheetFlatList: React.forwardRef((props: object, ref: unknown) => {
      React.useImperativeHandle(ref, () => ({ scrollToIndex: jest.fn() }));
      return React.createElement(FlatList, props);
    }),
  };
});

function mapState(overrides: Record<string, unknown> = {}) {
  return {
    data: { data: [], meta: { truncated: false } },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
    ...overrides,
  };
}

function listState(overrides: Record<string, unknown> = {}) {
  return {
    data: { data: [], meta: {} },
    isLoading: false,
    isError: false,
    refetch: jest.fn(),
    ...overrides,
  };
}

function lastMapQuery() {
  return mockEventsMap.mock.calls.at(-1)?.[0] as Record<string, unknown>;
}

function lastListQuery() {
  return mockEvents.mock.calls.at(-1)?.[0] as Record<string, unknown>;
}

// docs/specs/discovery.md R-15, R-17, R-18, R-19, AC-17, AC-18.
describe('S03 Map', () => {
  beforeEach(() => {
    clearBrowseArea();
    resetBrowseAreaCache();
    setBrowseArea(toBrowseArea(33.62, -117.93, 'Coastal Orange County', 'default'));
    mockEventsMap.mockReturnValue(mapState());
    mockEvents.mockReturnValue(listState());
  });

  it('R-15: asks for nothing until the region has settled', async () => {
    jest.useFakeTimers();
    try {
      await render(<MapScreen />);

      expect(mockEventsMap).toHaveBeenLastCalledWith(expect.anything(), { enabled: false });

      await act(async () => {
        jest.advanceTimersByTime(SETTLE_MS);
      });

      expect(mockEventsMap).toHaveBeenLastCalledWith(expect.anything(), { enabled: true });
      expect(lastMapQuery().bbox).toBe('-118.13,33.52,-117.73,33.72');
    } finally {
      jest.useRealTimers();
    }
  });

  it('AC-17: JDM and Recurring only reach the pins and the list together', async () => {
    jest.useFakeTimers();
    try {
      await render(<MapScreen />);
      await act(async () => {
        jest.advanceTimersByTime(SETTLE_MS);
      });

      // The Theme chip opens its options; JDM is one of them.
      await act(async () => {
        fireEvent.press(screen.getByLabelText(MAP_COPY.chipTheme));
      });
      await act(async () => {
        fireEvent.press(screen.getByLabelText('JDM'));
      });
      await act(async () => {
        fireEvent.press(screen.getByLabelText(MAP_COPY.chipRecurring));
      });

      expect(lastMapQuery()).toMatchObject({ 'tags[]': ['jdm'], recurring: true });
      expect(lastListQuery()).toMatchObject({ 'tags[]': ['jdm'], recurring: true });
      // One box for both: the pair answers one question about one viewport.
      expect(lastListQuery().bbox).toBe(lastMapQuery().bbox);
    } finally {
      jest.useRealTimers();
    }
  });

  it('R-15: a render on its own never changes the query, so nothing refetches', async () => {
    jest.useFakeTimers();
    try {
      await render(<MapScreen />);
      await act(async () => {
        jest.advanceTimersByTime(SETTLE_MS);
      });

      // The weekend chip is the one filter with a time window in it, which
      // is the shape a per-render clock would smear across the cache key.
      await act(async () => {
        fireEvent.press(screen.getByLabelText(MAP_COPY.chipWeekend));
      });
      const settled = JSON.stringify(lastMapQuery());

      // Time passes, and then two renders that leave the filters where they
      // were. A window read off the instant would move under both.
      await act(async () => {
        jest.advanceTimersByTime(90_000);
      });
      await act(async () => {
        fireEvent.press(screen.getByLabelText(MAP_COPY.chipRecurring));
      });
      await act(async () => {
        fireEvent.press(screen.getByLabelText(MAP_COPY.chipRecurring));
      });

      expect(JSON.stringify(lastMapQuery())).toBe(settled);
    } finally {
      jest.useRealTimers();
    }
  });

  it('AC-18: a truncated response draws its pins and says the rest are there', async () => {
    mockEventsMap.mockReturnValue(
      mapState({
        data: {
          data: [
            {
              id: 'o1',
              event_id: 'e1',
              slug: 'lido-saturday',
              lat: 33.62,
              lng: -117.93,
              starts_at: '2099-10-24T14:30:00Z',
              title: 'Lido Saturday',
              going_count: 0,
              recurring: false,
            },
          ],
          meta: { truncated: true },
        },
      }),
    );
    mockEvents.mockReturnValue(listState({ data: { data: [eventSummary()], meta: {} } }));

    jest.useFakeTimers();
    try {
      await render(<MapScreen />);
      await act(async () => {
        jest.advanceTimersByTime(SETTLE_MS);
      });

      expect(screen.getByText(MAP_COPY.truncated)).toBeTruthy();
      expect(screen.getByText(peekLabel(1))).toBeTruthy();
      // The pin on the map and its row in the sheet, both labelled by title.
      expect(screen.getAllByLabelText('Lido Saturday')).toHaveLength(2);
    } finally {
      jest.useRealTimers();
    }
  });

  it('R-18: an empty area offers all upcoming, and taking it drops the weekend', async () => {
    jest.useFakeTimers();
    try {
      await render(<MapScreen />);
      await act(async () => {
        jest.advanceTimersByTime(SETTLE_MS);
      });

      await act(async () => {
        fireEvent.press(screen.getByLabelText(MAP_COPY.chipWeekend));
      });
      expect(lastMapQuery().from).toBeDefined();

      expect(screen.getByText(MAP_COPY.empty)).toBeTruthy();
      await act(async () => {
        fireEvent.press(screen.getByText(MAP_COPY.emptyToggle));
      });

      expect(lastMapQuery().from).toBeUndefined();
    } finally {
      jest.useRealTimers();
    }
  });

  it('R-16: below the full detent a card recenters rather than opening the meet', async () => {
    mockEvents.mockReturnValue(listState({ data: { data: [eventSummary()], meta: {} } }));

    jest.useFakeTimers();
    try {
      await render(<MapScreen />);
      await act(async () => {
        jest.advanceTimersByTime(SETTLE_MS);
      });

      // S03's list of what is on the map: the row is a control, not a link.
      const row = screen.getByLabelText('Lido Saturday');
      expect(row.props.accessibilityRole).toBe('button');
    } finally {
      jest.useRealTimers();
    }
  });

  it('R-14: an error with nothing cached offers a retry in the sheet', async () => {
    const refetch = jest.fn();
    mockEventsMap.mockReturnValue(mapState({ isError: true, data: undefined, refetch }));

    jest.useFakeTimers();
    try {
      await render(<MapScreen />);
      await act(async () => {
        jest.advanceTimersByTime(SETTLE_MS);
      });

      expect(screen.getByText(MAP_COPY.error)).toBeTruthy();
      await act(async () => {
        fireEvent.press(screen.getByText(MAP_COPY.errorAction));
      });
      expect(refetch).toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('R-18: both sorts are offered, and Nearest sends the near it sorts by', async () => {
    jest.useFakeTimers();
    try {
      await render(<MapScreen />);
      await act(async () => {
        jest.advanceTimersByTime(SETTLE_MS);
      });

      // R-11 always leaves a browse area in place, even before S01, so the
      // map always has somewhere to be near and both sorts are reachable.
      expect(screen.getByText(MAP_COPY.sortSoonest)).toBeTruthy();
      expect(lastListQuery().sort).toBe('date');

      await act(async () => {
        fireEvent.press(screen.getByText(MAP_COPY.sortNearest));
      });

      expect(lastListQuery()).toMatchObject({ sort: 'distance', near: '33.62,-117.93' });
    } finally {
      jest.useRealTimers();
    }
  });
});

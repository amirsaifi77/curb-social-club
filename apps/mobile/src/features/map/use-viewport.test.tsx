import type { Region } from '@curb/ui';
import { describe, expect, it, jest } from '@jest/globals';
import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { SETTLE_MS, useViewport } from './use-viewport';

const LIDO: Region = {
  latitude: 33.62,
  longitude: -117.93,
  latitudeDelta: 0.2,
  longitudeDelta: 0.4,
};

let controls: ReturnType<typeof useViewport>;

function Probe() {
  controls = useViewport(LIDO);
  return <Text>{`${controls.bbox ?? 'none'} ${controls.showPill ? 'pill' : 'no-pill'}`}</Text>;
}

// docs/specs/discovery.md R-15, AC-15.
describe('the map viewport', () => {
  it('R-15: waits for the region to settle before the first fetch', async () => {
    jest.useFakeTimers();
    try {
      await render(<Probe />);
      expect(screen.getByText('none no-pill')).toBeTruthy();

      // Still moving at 299 ms: nothing is committed yet.
      // Most of the wait passes with the map still moving.
      await act(async () => {
        jest.advanceTimersByTime(SETTLE_MS - 50);
      });
      expect(screen.getByText('none no-pill')).toBeTruthy();

      // Then it moves again. A debounce restarts here; a one-shot timer set
      // at mount would fire 50 ms later and commit the old centre.
      await act(async () => {
        controls.onRegionChange({ ...LIDO, longitude: -117.9 });
      });
      await act(async () => {
        jest.advanceTimersByTime(SETTLE_MS - 1);
      });
      expect(screen.getByText('none no-pill')).toBeTruthy();

      await act(async () => {
        jest.advanceTimersByTime(1);
      });
      expect(screen.getByText('-118.1,33.52,-117.7,33.72 no-pill')).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });

  it('AC-15: a pan shows the pill, and only the pill fetches a new box', async () => {
    jest.useFakeTimers();
    try {
      await render(<Probe />);
      await act(async () => {
        jest.advanceTimersByTime(SETTLE_MS);
      });
      const first = controls.bbox;

      // Half a viewport across.
      await act(async () => {
        controls.onRegionChange({ ...LIDO, longitude: -117.73 });
      });
      await act(async () => {
        jest.advanceTimersByTime(SETTLE_MS * 4);
      });

      expect(controls.showPill).toBe(true);
      // The pins on screen still came from the old box: no silent refetch.
      expect(controls.bbox).toBe(first);

      await act(async () => {
        controls.commit();
      });
      expect(controls.bbox).not.toBe(first);
      expect(controls.showPill).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });

  it('R-15: a small nudge is not worth a pill', async () => {
    jest.useFakeTimers();
    try {
      await render(<Probe />);
      await act(async () => {
        jest.advanceTimersByTime(SETTLE_MS);
      });

      await act(async () => {
        controls.onRegionChange({ ...LIDO, longitude: -117.9 });
      });

      expect(controls.showPill).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });

  it('refuses a box the API would answer with a 400, and says so', async () => {
    jest.useFakeTimers();
    try {
      await render(<Probe />);
      await act(async () => {
        controls.onRegionChange({ ...LIDO, latitudeDelta: 8, longitudeDelta: 12 });
      });
      await act(async () => {
        jest.advanceTimersByTime(SETTLE_MS);
      });

      expect(controls.bbox).toBeNull();
      expect(controls.tooWide).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });
});

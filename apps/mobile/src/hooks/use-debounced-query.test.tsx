import { describe, expect, it, jest } from '@jest/globals';
import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { DEBOUNCE_MS, MIN_QUERY_LENGTH, useDebouncedQuery } from './use-debounced-query';

let controls: ReturnType<typeof useDebouncedQuery>;

function Probe() {
  controls = useDebouncedQuery();
  return <Text>{controls.query ?? 'none'}</Text>;
}

// docs/specs/discovery.md R-20 and AC-20.
describe('useDebouncedQuery', () => {
  it('R-20: the numbers are 250 ms and two characters', () => {
    // The rest of this suite imports the constants, so it checks the
    // mechanism. R-20 names the values, so something has to pin them.
    expect(DEBOUNCE_MS).toBe(250);
    expect(MIN_QUERY_LENGTH).toBe(2);
  });

  it('R-20: waits 250 ms, and a keystroke inside that restarts the wait', async () => {
    jest.useFakeTimers();
    try {
      await render(<Probe />);

      await act(async () => controls.setText('cor'));
      await act(async () => {
        jest.advanceTimersByTime(DEBOUNCE_MS - 1);
      });
      expect(screen.getByText('none')).toBeTruthy();

      // Typing again before the wait is up starts it over: one request for
      // "corona", not one for every prefix of it.
      await act(async () => controls.setText('coro'));
      await act(async () => {
        jest.advanceTimersByTime(DEBOUNCE_MS - 1);
      });
      expect(screen.getByText('none')).toBeTruthy();

      await act(async () => {
        jest.advanceTimersByTime(1);
      });
      expect(screen.getByText('coro')).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });

  it('R-20: one character is never worth a request', async () => {
    jest.useFakeTimers();
    try {
      await render(<Probe />);

      await act(async () => controls.setText('c'));
      await act(async () => {
        jest.advanceTimersByTime(DEBOUNCE_MS * 4);
      });

      expect(screen.getByText('none')).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });

  it('a trailing space is not a different search', async () => {
    jest.useFakeTimers();
    try {
      await render(<Probe />);

      await act(async () => controls.setText('  corona  '));
      await act(async () => {
        jest.advanceTimersByTime(DEBOUNCE_MS);
      });

      expect(screen.getByText('corona')).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });

  it('clearing the field brings the recents back at once, not in 250 ms', async () => {
    jest.useFakeTimers();
    try {
      await render(<Probe />);
      await act(async () => controls.setText('corona'));
      await act(async () => {
        jest.advanceTimersByTime(DEBOUNCE_MS);
      });
      expect(screen.getByText('corona')).toBeTruthy();

      await act(async () => controls.clear());

      expect(screen.getByText('none')).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });
});

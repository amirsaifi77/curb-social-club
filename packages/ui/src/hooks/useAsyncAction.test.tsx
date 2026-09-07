// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useAsyncAction } from './useAsyncAction';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useAsyncAction', () => {
  it('exposes status, run, error, and reset over the machine', async () => {
    const fn = vi.fn(() => new Promise<void>((resolve) => setTimeout(resolve, 100)));
    const { result } = renderHook(() => useAsyncAction(fn));
    expect(result.current.status).toBe('idle');

    const { run } = result.current;
    act(() => run());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });
    expect(result.current.status).toBe('confirmed');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    expect(result.current.status).toBe('going');
    expect(result.current.run).toBe(run);

    act(() => result.current.reset());
    expect(result.current.status).toBe('idle');
  });

  it('reads the latest fn on each run and reports its error', async () => {
    let attempt = 0;
    const { result } = renderHook(() =>
      useAsyncAction(() => {
        attempt += 1;
        return attempt === 1 ? Promise.reject(new Error('first')) : Promise.resolve();
      }),
    );
    act(() => result.current.run());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(600);
    });
    expect(result.current.status).toBe('error');
    expect(result.current.error).toEqual(new Error('first'));

    act(() => result.current.run());
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(result.current.status).toBe('confirmed');
  });
});

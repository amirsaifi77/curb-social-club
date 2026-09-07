import { motion } from '@curb/design-tokens';

// The primary CTA state machine (docs/components/primary-cta.md), free of
// React so its timing can be tested with fake timers. useAsyncAction wraps
// it. Every duration comes from motion.asyncButton (R-17).

export type AsyncActionStatus = 'idle' | 'loading' | 'confirmed' | 'going' | 'error';

export interface AsyncActionTimings {
  // Loading appears only if the promise is still pending after this long.
  delay: number;
  // Once shown, loading stays at least this long.
  minLoading: number;
  // Confirmed holds this long before settling into going.
  hold: number;
  // A pending promise becomes error after this long; a late success still settles.
  timeout: number;
  // stillWorking turns on this long after run() while still loading.
  stillWorkingAfter: number;
}

export const DEFAULT_TIMINGS: AsyncActionTimings = {
  delay: motion.asyncButton.loadingDelay,
  minLoading: motion.asyncButton.loadingMin,
  hold: motion.asyncButton.confirmedHold,
  timeout: motion.asyncButton.timeout,
  stillWorkingAfter: motion.asyncButton.stillWorkingAfter,
};

export interface AsyncActionState {
  status: AsyncActionStatus;
  error: unknown;
  stillWorking: boolean;
  // True from run() until the run reaches idle, going, or error, including
  // the delay window before loading shows; run() is ignored while pending.
  pending: boolean;
}

export interface AsyncActionMachine {
  getState(): AsyncActionState;
  subscribe(listener: () => void): () => void;
  // Runs fn unless a run is pending. From going the run is a removal:
  // success settles to idle instead of confirmed.
  run(fn: () => Promise<unknown>): void;
  reset(): void;
  dispose(): void;
}

type Timer = ReturnType<typeof setTimeout>;

export function createAsyncActionMachine(
  options: Partial<AsyncActionTimings> = {},
  clock: { now(): number } = { now: () => Date.now() },
): AsyncActionMachine {
  const timings: AsyncActionTimings = { ...DEFAULT_TIMINGS, ...options };
  let state: AsyncActionState = {
    status: 'idle',
    error: null,
    stillWorking: false,
    pending: false,
  };
  const listeners = new Set<() => void>();
  const timers = new Set<Timer>();
  // Per run: when loading appeared (null while it has not), whether the run
  // settled (success, failure, or timeout), and whether it removes.
  let loadingShownAt: number | null = null;
  let settled: 'success' | 'failure' | 'timeout' | null = null;
  let removing = false;
  let runId = 0;

  const emit = () => listeners.forEach((listener) => listener());
  const setState = (next: Partial<AsyncActionState>) => {
    state = { ...state, ...next };
    emit();
  };

  function after(ms: number, callback: () => void): void {
    const timer = setTimeout(() => {
      timers.delete(timer);
      callback();
    }, ms);
    timers.add(timer);
  }

  function clearTimers(): void {
    timers.forEach((timer) => clearTimeout(timer));
    timers.clear();
  }

  // Loading, once shown, stays for minLoading; anything that follows waits.
  function afterMinLoading(callback: () => void): void {
    if (loadingShownAt === null) {
      callback();
      return;
    }
    const remaining = loadingShownAt + timings.minLoading - clock.now();
    if (remaining <= 0) callback();
    else after(remaining, callback);
  }

  // A run's final states clear its remaining timers (still working, timeout).
  function finish(next: Partial<AsyncActionState>): void {
    clearTimers();
    setState({ ...next, stillWorking: false, pending: false });
  }

  function settleSuccess(id: number): void {
    if (id !== runId) return;
    if (settled === 'timeout') {
      // Late success after the timeout: reconcile silently (no confirmed).
      finish({ status: removing ? 'idle' : 'going', error: null });
      return;
    }
    if (settled) return;
    settled = 'success';
    afterMinLoading(() => {
      if (id !== runId) return;
      if (removing) {
        finish({ status: 'idle', error: null });
        return;
      }
      clearTimers();
      setState({ status: 'confirmed', error: null, stillWorking: false });
      after(timings.hold, () => {
        if (id === runId) finish({ status: 'going' });
      });
    });
  }

  function settleFailure(id: number, error: unknown): void {
    if (id !== runId || settled) return;
    settled = 'failure';
    // A failure before loading has shown still shows loading for its
    // minimum, so it reads as tried, then failed.
    const showError = () => {
      if (id === runId) finish({ status: 'error', error });
    };
    if (loadingShownAt === null) {
      const untilLoading = Math.max(0, startedAt + timings.delay - clock.now());
      after(untilLoading, () => {
        if (id !== runId) return;
        showLoading();
        after(timings.minLoading, showError);
      });
      return;
    }
    afterMinLoading(showError);
  }

  let startedAt = 0;

  function showLoading(): void {
    if (loadingShownAt !== null) return;
    loadingShownAt = clock.now();
    setState({ status: 'loading' });
  }

  function run(fn: () => Promise<unknown>): void {
    if (state.pending) return;
    clearTimers();
    const id = ++runId;
    removing = state.status === 'going';
    loadingShownAt = null;
    settled = null;
    startedAt = clock.now();
    setState({ error: null, stillWorking: false, pending: true });

    after(timings.delay, () => {
      if (id === runId && !settled) showLoading();
    });
    after(timings.stillWorkingAfter, () => {
      if (id === runId && !settled && state.status === 'loading') setState({ stillWorking: true });
    });
    after(timings.timeout, () => {
      if (id !== runId || settled) return;
      settled = 'timeout';
      finish({ status: 'error', error: new Error('timeout') });
    });

    let promise: Promise<unknown>;
    try {
      promise = Promise.resolve(fn());
    } catch (error) {
      promise = Promise.reject(error);
    }
    promise.then(
      () => settleSuccess(id),
      (error: unknown) => settleFailure(id, error),
    );
  }

  function reset(): void {
    clearTimers();
    runId += 1;
    setState({ status: 'idle', error: null, stillWorking: false, pending: false });
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    run,
    reset,
    dispose() {
      clearTimers();
      runId += 1;
      listeners.clear();
    },
  };
}

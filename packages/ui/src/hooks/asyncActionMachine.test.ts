import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createAsyncActionMachine,
  DEFAULT_TIMINGS,
  type AsyncActionStatus,
} from './asyncActionMachine';

// Every scenario from docs/specs/design-system-and-theming.md AC-8 to AC-10.

function deferred<T = void>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

// Records every status change with its time; the initial idle is not a change.
function harness() {
  const machine = createAsyncActionMachine();
  const statuses: Array<[number, AsyncActionStatus]> = [];
  let last: AsyncActionStatus = machine.getState().status;
  machine.subscribe(() => {
    const status = machine.getState().status;
    if (status !== last) {
      statuses.push([Date.now(), status]);
      last = status;
    }
  });
  return { machine, statuses, seen: () => statuses.map(([, status]) => status) };
}

async function tick(ms: number) {
  await vi.advanceTimersByTimeAsync(ms);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useAsyncAction state machine', () => {
  it('reads its defaults from the motion tokens', () => {
    expect(DEFAULT_TIMINGS).toEqual({
      delay: 150,
      minLoading: 400,
      hold: 600,
      timeout: 10_000,
      stillWorkingAfter: 2_000,
    });
  });

  it('skips loading when fn resolves under the delay and settles after the hold (AC-8)', async () => {
    const { machine, statuses, seen } = harness();
    const action = deferred();
    machine.run(() => action.promise);
    await tick(100);
    action.resolve();
    await tick(0);
    expect(seen()).toEqual(['confirmed']);
    expect(statuses[0]?.[0]).toBe(100);

    await tick(599);
    expect(machine.getState().status).toBe('confirmed');
    await tick(1);
    expect(machine.getState().status).toBe('going');
  });

  it('shows loading at the delay and keeps it for the minimum when fn resolves at 160 ms (AC-9)', async () => {
    const { machine, statuses, seen } = harness();
    const action = deferred();
    machine.run(() => action.promise);
    await tick(160);
    expect(seen()).toEqual(['loading']);
    expect(statuses[0]?.[0]).toBe(150);
    action.resolve();
    await tick(389);
    expect(machine.getState().status).toBe('loading');
    await tick(1);
    expect(machine.getState().status).toBe('confirmed');
    expect(statuses[1]?.[0]).toBe(550);
    await tick(600);
    expect(seen()).toEqual(['loading', 'confirmed', 'going']);
  });

  it('never shows error before loading has had its minimum when fn rejects early (AC-10)', async () => {
    const { machine, statuses, seen } = harness();
    const action = deferred();
    machine.run(() => action.promise);
    await tick(50);
    action.reject(new Error('offline'));
    await tick(0);
    expect(seen()).toEqual([]);
    await tick(100);
    expect(seen()).toEqual(['loading']);
    await tick(399);
    expect(machine.getState().status).toBe('loading');
    await tick(1);
    expect(seen()).toEqual(['loading', 'error']);
    expect(statuses[1]?.[0]).toBe(550);
    expect(machine.getState().error).toEqual(new Error('offline'));
  });

  it('times out at 10 s and reconciles a late success into going without confirmed (AC-10)', async () => {
    const { machine, seen } = harness();
    const action = deferred();
    machine.run(() => action.promise);
    await tick(2_000);
    expect(machine.getState().stillWorking).toBe(true);
    await tick(7_999);
    expect(machine.getState().status).toBe('loading');
    await tick(1);
    expect(machine.getState().status).toBe('error');
    expect(machine.getState().stillWorking).toBe(false);
    await tick(2_000);
    action.resolve();
    await tick(0);
    expect(machine.getState().status).toBe('going');
    expect(seen()).toEqual(['loading', 'error', 'going']);
  });

  it('ignores a second run inside the delay window and while loading, then runs again from error', async () => {
    const { machine } = harness();
    const first = deferred();
    const fn = vi.fn(() => first.promise);
    machine.run(fn);
    expect(machine.getState().pending).toBe(true);
    await tick(100);
    machine.run(fn);
    expect(fn).toHaveBeenCalledTimes(1);
    await tick(100);
    machine.run(fn);
    expect(fn).toHaveBeenCalledTimes(1);
    first.reject(new Error('x'));
    await tick(349);
    expect(machine.getState().status).toBe('loading');
    await tick(1);
    expect(machine.getState().status).toBe('error');
    expect(machine.getState().pending).toBe(false);

    const second = deferred();
    machine.run(() => second.promise);
    await tick(10);
    second.resolve();
    await tick(0);
    expect(machine.getState().status).toBe('confirmed');
    expect(machine.getState().error).toBeNull();
    expect(machine.getState().pending).toBe(true);
    machine.run(fn);
    expect(fn).toHaveBeenCalledTimes(1);
    await tick(600);
    expect(machine.getState().status).toBe('going');
    expect(machine.getState().pending).toBe(false);
  });

  it('clears the still-working and timeout timers once a run has settled', async () => {
    const { machine } = harness();
    machine.run(() => Promise.resolve());
    await tick(700);
    expect(machine.getState().status).toBe('going');
    await tick(10_000);
    expect(machine.getState().status).toBe('going');
    expect(machine.getState().stillWorking).toBe(false);
  });

  it('treats a run from going as a removal that settles to idle', async () => {
    const { machine, seen } = harness();
    machine.run(() => Promise.resolve());
    await tick(700);
    expect(machine.getState().status).toBe('going');

    const removal = deferred();
    machine.run(() => removal.promise);
    await tick(300);
    expect(machine.getState().status).toBe('loading');
    removal.resolve();
    await tick(400);
    expect(machine.getState().status).toBe('idle');
    expect(seen()).toEqual(['confirmed', 'going', 'loading', 'idle']);
  });

  it('reset returns to idle and drops the in-flight run', async () => {
    const { machine } = harness();
    const action = deferred();
    machine.run(() => action.promise);
    await tick(200);
    machine.reset();
    expect(machine.getState().status).toBe('idle');
    action.resolve();
    await tick(2_000);
    expect(machine.getState().status).toBe('idle');
  });

  it('accepts overrides and a throwing fn', async () => {
    const machine = createAsyncActionMachine({ delay: 10, minLoading: 20, hold: 30 });
    machine.run(() => {
      throw new Error('sync');
    });
    await tick(10);
    expect(machine.getState().status).toBe('loading');
    await tick(20);
    expect(machine.getState().status).toBe('error');
    expect(machine.getState().error).toEqual(new Error('sync'));
  });
});

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';

import {
  createAsyncActionMachine,
  type AsyncActionState,
  type AsyncActionStatus,
  type AsyncActionTimings,
} from './asyncActionMachine';

export interface UseAsyncActionResult extends AsyncActionState {
  status: AsyncActionStatus;
  // Starts the action; ignored while one is in flight.
  run: () => void;
  // Back to idle, dropping any in-flight run.
  reset: () => void;
}

// The primary CTA hook (R-17): { status, run, error, pending } over the
// state machine, with the timings from @curb/design-tokens motion.asyncButton
// unless overridden. fn is read fresh on every run, so callers need not
// memoize it; options are read once, when the machine is created.
export function useAsyncAction(
  fn: () => Promise<unknown>,
  options: Partial<AsyncActionTimings> = {},
): UseAsyncActionResult {
  const fnRef = useRef(fn);
  fnRef.current = fn;

  const machineRef = useRef<ReturnType<typeof createAsyncActionMachine> | null>(null);
  if (machineRef.current === null) machineRef.current = createAsyncActionMachine(options);
  const machine = machineRef.current;

  useEffect(() => () => machine.dispose(), [machine]);

  const state = useSyncExternalStore(machine.subscribe, machine.getState, machine.getState);
  const run = useCallback(() => machine.run(() => fnRef.current()), [machine]);
  const reset = useCallback(() => machine.reset(), [machine]);

  return { ...state, run, reset };
}

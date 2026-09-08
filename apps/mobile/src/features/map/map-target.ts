import type { BrowseArea } from '@/lib/browse-location';

// R-20 and AC-22: picking a place on S05 moves S03 to it. The map does not
// follow the browse area in general, because that would fight a pan, so a
// place pick is its own signal: a deliberate "go here" that the map
// consumes once and then forgets.
type Listener = () => void;

const listeners = new Set<Listener>();
let target: BrowseArea | null = null;
// Bumped on every request, so picking the same place twice is two moves.
let requested = 0;

export function requestMapTarget(area: BrowseArea): void {
  target = area;
  requested += 1;
  for (const listener of listeners) listener();
}

export function subscribeMapTarget(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function mapTargetVersion(): number {
  return requested;
}

export function readMapTarget(): BrowseArea | null {
  return target;
}

// Test seam.
export function resetMapTarget(): void {
  target = null;
  requested = 0;
  for (const listener of listeners) listener();
}

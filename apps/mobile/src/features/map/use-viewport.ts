import { bboxFromRegion, bboxParam, isRequestableBbox, movedEnough, type Region } from '@curb/ui';
import { useCallback, useEffect, useRef, useState } from 'react';

// R-15: the first load fetches 300 ms after the region settles; after that
// only the "search this area" pill fetches, and it only appears once the map
// has moved more than a fifth of the viewport or a whole zoom level from the
// box the pins came from.
export const SETTLE_MS = 300;

export interface Viewport {
  /** What the map is showing now. */
  region: Region;
  /** The box the pins on screen came from, null before the first fetch. */
  committed: Region | null;
  /** `bbox` for the queries, null until a box has been committed. */
  bbox: string | null;
  /** R-15: whether the pill is on screen. */
  showPill: boolean;
  /** The committed box is too wide for the API to answer. */
  tooWide: boolean;
  onRegionChange: (region: Region) => void;
  /** The pill, and the first settle. */
  commit: () => void;
}

export function useViewport(initial: Region): Viewport {
  const [region, setRegion] = useState(initial);
  const [committed, setCommitted] = useState<Region | null>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(initial);

  const commit = useCallback(() => setCommitted(latest.current), []);

  const onRegionChange = useCallback((next: Region) => {
    latest.current = next;
    setRegion(next);
  }, []);

  // Only the first load waits for the region to settle. Afterwards a pan is
  // a pan, and the person asks for pins with the pill.
  useEffect(() => {
    if (committed !== null) return;
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(() => setCommitted(latest.current), SETTLE_MS);
    return () => {
      if (settle.current) clearTimeout(settle.current);
    };
  }, [committed, region]);

  const box = committed ? bboxFromRegion(committed) : null;

  return {
    region,
    committed,
    bbox: box && isRequestableBbox(box) ? bboxParam(box) : null,
    showPill: committed !== null && movedEnough(committed, region),
    tooWide: box !== null && !isRequestableBbox(box),
    onRegionChange,
    commit,
  };
}

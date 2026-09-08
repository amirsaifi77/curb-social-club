import { api, createClient } from '@curb/api-client';
import {
  bboxParam,
  createPinIndex,
  isRequestableBbox,
  movedEnough,
  regionFromBbox,
  type Bbox,
  type MapFeature,
  type MapPinInput,
} from '@curb/ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';

import type { Route } from './+types/map';

import { WEB_COPY } from '~/lib/copy';
import { dayAndTime } from '~/lib/format';
import { pageMeta } from '~/lib/seo';

// W05 (web.md R-15). Client only: a map is not content a crawler can read,
// and server-rendering MapLibre would ship a canvas nobody can use. The
// same cluster wrapper the mobile map uses, so the two agree on what a
// cluster is.
export const MOVE_DEBOUNCE_MS = 300;
export const DEFAULT_CENTER = { lat: 33.62, lng: -117.93 };
export const DEFAULT_ZOOM = 10;
const VIEWER_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

export function meta() {
  return pageMeta({
    title: 'Map',
    description: 'Car meets near you, on a map.',
    canonical: null,
    // R-15: a map of a moving viewport is not an address worth indexing.
    noindex: true,
  });
}

// The API URL and the tile style both come from the browser's own
// environment, since this route never runs on the server.
export async function clientLoader() {
  return {
    apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:3000',
    styleUrl:
      import.meta.env.VITE_MAP_STYLE_URL ?? 'https://tiles.openfreemap.org/styles/positron',
  };
}
clientLoader.hydrate = true as const;

export function HydrateFallback() {
  return (
    <main className="mx-auto max-w-pageMax px-gutter py-10">
      <p className="text-textSecondary">{WEB_COPY.mapLoading}</p>
    </main>
  );
}


export default function MapPage({ loaderData }: Route.ComponentProps) {
  const { apiUrl, styleUrl } = loaderData;
  const container = useRef<HTMLDivElement | null>(null);
  const lastBbox = useRef<Bbox | null>(null);
  const [pins, setPins] = useState<MapPinInput[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'too_wide'>('idle');

  const load = useCallback(
    async (bbox: Bbox) => {
      // R-19: a box the API will not answer is a notice, not a request.
      if (!isRequestableBbox(bbox)) {
        setStatus('too_wide');
        return;
      }
      setStatus('loading');
      try {
        const client = createClient({ baseUrl: apiUrl });
        const response = await api.events.map(client, { bbox: bboxParam(bbox) });
        setPins(response.data as unknown as MapPinInput[]);
        setStatus('idle');
      } catch {
        setStatus('error');
      }
    },
    [apiUrl],
  );

  useEffect(() => {
    if (!container.current) return;
    let map: import('maplibre-gl').Map | null = null;
    let timer: number | undefined;
    let cancelled = false;

    void (async () => {
      const maplibre = await import('maplibre-gl');
      if (cancelled || !container.current) return;
      map = new maplibre.Map({
        container: container.current,
        style: styleUrl,
        center: [DEFAULT_CENTER.lng, DEFAULT_CENTER.lat],
        zoom: DEFAULT_ZOOM,
      });

      const onMoveEnd = () => {
        const bounds = map?.getBounds();
        if (!bounds) return;
        const bbox: Bbox = {
          west: bounds.getWest(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          north: bounds.getNorth(),
        };
        // R-15: 300 ms after the move settles, and only when the box moved
        // enough to be a different question.
        window.clearTimeout(timer);
        timer = window.setTimeout(() => {
          if (
            lastBbox.current &&
            !movedEnough(regionFromBbox(lastBbox.current), regionFromBbox(bbox))
          ) {
            return;
          }
          lastBbox.current = bbox;
          void load(bbox);
        }, MOVE_DEBOUNCE_MS);
      };

      map.on('load', onMoveEnd);
      map.on('moveend', onMoveEnd);
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      map?.remove();
    };
  }, [styleUrl, load]);

  // The same wrapper the mobile map uses, so a cluster on the web is the
  // same cluster on the phone. The side list is the pins in view, which is
  // what R-15 asks for: a cluster is a count, not a row.
  const features: MapFeature[] =
    pins.length > 0
      ? createPinIndex(pins).featuresIn(
          lastBbox.current ?? { west: -180, south: -85, east: 180, north: 85 },
          Math.round(DEFAULT_ZOOM),
        )
      : [];
  const inView = features.filter(
    (feature): feature is Extract<MapFeature, { type: 'pin' }> => feature.type === 'pin',
  );

  return (
    <main className="mx-auto flex max-w-pageMax flex-col gap-4 px-gutter py-6 lg:flex-row">
      <div ref={container} className="h-[60vh] w-full border border-border lg:w-2/3" />

      <aside className="lg:w-1/3">
        {status === 'too_wide' ? (
          <p className="text-textSecondary">{WEB_COPY.mapTruncated}</p>
        ) : null}
        {status === 'error' ? <p className="text-textSecondary">{WEB_COPY.mapError}</p> : null}
        {status === 'idle' && inView.length === 0 ? (
          <p className="text-textSecondary">{WEB_COPY.mapEmpty}</p>
        ) : null}

        <ul className="flex flex-col gap-3">
          {inView.map((feature) => (
            <li key={feature.pin.id} className="border border-border bg-surface p-3">
              <Link to={`/meets/${feature.pin.slug}`} className="font-display text-xl">
                {feature.pin.title}
              </Link>
              <p className="text-sm text-textSecondary">
                {/* MapPin carries no timezone (discovery R-16), so the
                    web reads the time in the reader's own zone, which on a
                    map of meets near them is the venue's zone too. */}
                {dayAndTime(feature.pin.starts_at, VIEWER_TIMEZONE)}
              </p>
            </li>
          ))}
        </ul>
      </aside>
    </main>
  );
}

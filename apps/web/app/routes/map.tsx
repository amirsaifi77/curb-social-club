import { api, createClient } from '@curb/api-client';
import {
  bboxParam,
  createPinIndex,
  isRequestableBbox,
  movedEnough,
  regionFromBbox,
  type Bbox,
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
  const [map, setMap] = useState<import('maplibre-gl').Map | null>(null);

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
      setMap(map);
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      setMap(null);
      map?.remove();
    };
  }, [styleUrl, load]);

  // The same wrapper the mobile map uses, so a cluster on the web is the
  // same cluster on the phone: one marker per pin, one plate per cluster.
  useEffect(() => {
    if (!map || pins.length === 0) return;
    let cancelled = false;
    const markers: import('maplibre-gl').Marker[] = [];

    void (async () => {
      const maplibre = await import('maplibre-gl');
      if (cancelled) return;
      const bounds = map.getBounds();
      const features = createPinIndex(pins).featuresIn(
        {
          west: bounds.getWest(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          north: bounds.getNorth(),
        },
        map.getZoom(),
      );

      for (const feature of features) {
        const element = document.createElement('button');
        element.type = 'button';
        element.className = 'rounded-full border border-border bg-surfaceRaised px-2 py-1 text-xs';
        element.textContent =
          feature.type === 'cluster' ? String(feature.count) : feature.pin.title;
        element.setAttribute(
          'aria-label',
          feature.type === 'cluster' ? `${feature.count} meets` : feature.pin.title,
        );
        element.dataset.mapFeature = feature.type;
        markers.push(
          new maplibre.Marker({ element }).setLngLat([feature.lng, feature.lat]).addTo(map),
        );
      }
    })();

    return () => {
      cancelled = true;
      for (const marker of markers) marker.remove();
    };
  }, [map, pins]);

  // R-15 asks for the events in view beside the map. That is every pin the
  // API returned for this box, not only the ones that happened not to
  // cluster: clustering is how the map draws forty pins, not a reason to
  // hide thirty-nine of them from the list.
  const inView = pins;

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
          {inView.map((pin) => (
            <li key={pin.id} className="border border-border bg-surface p-3">
              <Link to={`/meets/${pin.slug}`} className="font-display text-xl">
                {pin.title}
              </Link>
              <p className="text-sm text-textSecondary">
                {/* A MapPin carries no timezone (discovery R-16), so the web
                    reads the time in the reader's own zone, which on a map
                    of meets near them is the venue's zone too. */}
                {dayAndTime(pin.starts_at, VIEWER_TIMEZONE)}
              </p>
            </li>
          ))}
        </ul>
      </aside>
    </main>
  );
}

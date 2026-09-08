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
import { apiUrl, mapStyleUrl } from '~/lib/env.server';
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

// The map is the one surface that calls the API from the browser, so it
// needs the addresses at runtime. VITE_* is inlined at build time, which
// would bake whatever the build machine had into the bundle and ship a map
// calling localhost from an https page; these come off the server, where
// env.server.ts reads API_URL the way R-23 says and throws when it is
// unset.
export async function loader() {
  return { apiUrl: apiUrl(), styleUrl: mapStyleUrl() };
}

// R-15: client only. The server loader supplies the configuration and this
// is what makes the route hydrate without server-rendering the map.
export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) {
  return serverLoader();
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
  const [status, setStatus] = useState<'idle' | 'loading' | 'answered' | 'error' | 'too_wide'>('idle');
  const [map, setMap] = useState<import('maplibre-gl').Map | null>(null);
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

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
        setStatus('answered');
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
        // Redraws the clusters even when the box did not move enough to be
        // worth a request: a zoom of half a level leaves the old clusters
        // on screen otherwise.
        setZoom(map?.getZoom() ?? DEFAULT_ZOOM);
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
      // OpenFreeMap has no SLA (web.md Risks). Without this the style
      // failing means 'load' never fires, the pins are never fetched, and
      // the page tells the reader there are no meets when the truth is the
      // map is down.
      map.on('error', () => setStatus('error'));
      setMap(map);
      // A handle for the e2e suite to pan with. AC-11 is about what a pan
      // costs, and there is no other way to drive a WebGL canvas from a
      // test without simulating drags that the map may or may not read.
      (window as unknown as { __map?: unknown }).__map = map;
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
  }, [map, pins, zoom]);

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
        {status === 'loading' ? (
          <p className="text-textSecondary">{WEB_COPY.mapLoading}</p>
        ) : null}
        {status === 'answered' && inView.length === 0 ? (
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

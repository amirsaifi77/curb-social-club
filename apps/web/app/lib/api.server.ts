import { api, createClient, type ApiClient } from '@curb/api-client';

import { apiUrl } from './env.server';

// Server-side access to the Rails API. A runtime VITE_API_URL (process.env,
// the Vercel project's environment) wins over the value Vite inlined at
// build time, so a deployment can be repointed without a rebuild.
export interface ApiHealth {
  ok: boolean;
  status?: number;
  detail?: string;
}

const DEFAULT_API_URL = 'http://localhost:3000';

export function apiBaseUrl(
  value: string | undefined = process.env.VITE_API_URL ?? import.meta.env.VITE_API_URL,
): string {
  return (value?.trim() || DEFAULT_API_URL).replace(/\/+$/, '');
}

export async function fetchApiHealth(
  baseUrl: string,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = 2_500,
): Promise<ApiHealth> {
  try {
    const response = await fetchImpl(`${baseUrl}/v1/health`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return { ok: false, status: response.status };
    const body = (await response.json()) as { data?: { status?: string } };
    return { ok: true, status: response.status, detail: body.data?.status };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.name : 'unreachable' };
  }
}

// R-1: every loader calls the API anonymously, with the device cookie as
// X-Device-Id and no token. One client per request, because the device id
// belongs to the request rather than to the process.
// Every read is bounded. A page that waits forever on the API is a page
// that holds a Vercel function open until it is killed, and /og/meets is
// the route every link preview hits.
export const API_TIMEOUT_MS = 5_000;

export function serverClient(deviceId: string | null, timeoutMs = API_TIMEOUT_MS): ApiClient {
  return createClient({
    baseUrl: apiUrl(),
    ...(deviceId ? { getDeviceId: () => deviceId } : {}),
    fetch: (input: RequestInfo | URL, init?: RequestInit) =>
      fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(timeoutMs) }),
  });
}

// R-2: IP geolocation from Vercel's headers, rounded to two decimals before
// it is sent and never persisted. Coastal Orange County when the headers
// are absent (R-13).
export const FALLBACK_NEAR = { lat: 33.62, lng: -117.93 };

// The reader's coarse location, or nothing. A caller that must have one
// uses nearFromRequest; a caller whose query means something different
// without one (the club directory, R-22) needs to tell them apart.
export function vercelNear(request: Request): string | null {
  const rawLat = request.headers.get('x-vercel-ip-latitude');
  const rawLng = request.headers.get('x-vercel-ip-longitude');
  if (rawLat === null || rawLng === null) return null;
  const lat = Number(rawLat);
  const lng = Number(rawLng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return roundNear(lat, lng);
}

export function nearFromRequest(request: Request): string {
  return vercelNear(request) ?? roundNear(FALLBACK_NEAR.lat, FALLBACK_NEAR.lng);
}

// R-21: the three meets a 404 offers instead of a dead end. A 410 comes
// with its own `nearby` from the API; a 404 has nothing but the reader's
// approximate location, so it reads the same feed the home page does.
export async function nearbyMeets(client: ApiClient, request: Request): Promise<unknown[]> {
  try {
    const feed = await api.feed.get(client, { near: nearFromRequest(request) });
    return feed.data.sections.find((section) => section.kind === 'this_weekend')?.items ?? [];
  } catch {
    // A not-found page that cannot load its suggestions is still a
    // not-found page, and this one is already answering an error.
    return [];
  }
}

// A `near` a page put in its own URL ("Near me" on W01). Re-rounded here
// rather than trusted: the query string is the reader's to edit, and a
// six-decimal value in a server log is the thing R-2 exists to prevent.
export function parseNear(value: string | null): string | null {
  if (!value) return null;
  const [lat, lng] = value.split(',').map(Number);
  if (lat === undefined || lng === undefined) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return roundNear(lat, lng);
}

// Two decimals is about a kilometre, which is all the API needs to sort by
// distance and all a log should ever hold (location privacy, CLAUDE.md).
export function roundNear(lat: number, lng: number): string {
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

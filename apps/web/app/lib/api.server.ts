import { createClient, type ApiClient } from '@curb/api-client';

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
export function serverClient(deviceId: string | null): ApiClient {
  return createClient({
    baseUrl: apiUrl(),
    ...(deviceId ? { getDeviceId: () => deviceId } : {}),
  });
}

// R-2: IP geolocation from Vercel's headers, rounded to two decimals before
// it is sent and never persisted. Coastal Orange County when the headers
// are absent (R-13).
export const FALLBACK_NEAR = { lat: 33.62, lng: -117.93 };

export function nearFromRequest(request: Request): string {
  const lat = Number(request.headers.get('x-vercel-ip-latitude'));
  const lng = Number(request.headers.get('x-vercel-ip-longitude'));
  const usable = Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0);
  const point = usable ? { lat, lng } : FALLBACK_NEAR;
  return roundNear(point.lat, point.lng);
}

// Two decimals is about a kilometre, which is all the API needs to sort by
// distance and all a log should ever hold (location privacy, CLAUDE.md).
export function roundNear(lat: number, lng: number): string {
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

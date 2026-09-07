// Server-side access to the Rails API. VITE_API_URL is inlined at build time
// (Vite) and can be overridden at runtime through process.env, which is how
// the Vercel project points a build at the Render staging API.
export interface ApiHealth {
  ok: boolean;
  status?: number;
  detail?: string;
}

const DEFAULT_API_URL = 'http://localhost:3000';

export function apiBaseUrl(
  value: string | undefined = import.meta.env.VITE_API_URL ?? process.env.VITE_API_URL,
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

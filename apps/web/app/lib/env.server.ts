// web.md R-23: the four environment variables the app reads, with no
// defaults committed. A missing one is a deployment mistake, not a value to
// invent: the domain is unconfirmed (gaps item 2) and a hardcoded fallback
// would ship the wrong canonical URL rather than fail.

function read(name: string): string | null {
  const value = process.env[name] ?? import.meta.env[name];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

export function apiUrl(): string {
  // The one exception: local development has an obvious API to talk to, and
  // 0.8 already shipped this fallback for the health check.
  return (read('API_URL') ?? read('VITE_API_URL') ?? 'http://localhost:3000').replace(/\/+$/, '');
}

// The canonical origin every page's URL, OG image and app-argument is built
// from. Absent means the deployment has not been told its own address, so
// canonical and OG links are omitted rather than pointed somewhere wrong.
export function shareBaseUrl(): string | null {
  const value = read('SHARE_BASE_URL');
  return value ? value.replace(/\/+$/, '') : null;
}

// R-11: the smart banner and the App Store fallback render only when App
// Store Connect has reserved an id.
export function appStoreId(): string | null {
  return read('APP_STORE_ID');
}

// R-18: the AASA's appID prefix. Used by 1.17's well-known route.
export function teamId(): string | null {
  return read('TEAM_ID');
}

export interface WebEnv {
  shareBaseUrl: string | null;
  appStoreId: string | null;
}

// The half of the environment the browser needs: the store id for the
// fallback link and the origin for a copied link. Never the API URL, which
// the browser has no business calling directly.
export function publicEnv(): WebEnv {
  return { shareBaseUrl: shareBaseUrl(), appStoreId: appStoreId() };
}

// web.md R-23: the four environment variables the app reads, with no
// defaults committed. A missing one is a deployment mistake, not a value to
// invent: the domain is unconfirmed (gaps item 2) and a hardcoded fallback
// would ship the wrong canonical URL rather than fail.

function read(name: string): string | null {
  const value = process.env[name] ?? import.meta.env[name];
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

// R-23: no default is committed. A deployment without it fails loudly at
// the first request rather than spending every page on a connection refused
// to a localhost that is not there.
export const DEV_API_URL = 'http://localhost:3000';

export function apiUrl(): string {
  const value = read('API_URL') ?? read('VITE_API_URL');
  if (value) return value.replace(/\/+$/, '');
  // Local development is the one place a default is a kindness rather than
  // a silent misconfiguration: there is an obvious API on 3000 and no
  // deployment to mistake it for.
  if (import.meta.env?.DEV) return DEV_API_URL;
  throw new Error('API_URL is not set. web.md R-23: it has no default.');
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

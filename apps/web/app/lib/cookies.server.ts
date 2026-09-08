import { randomUUID } from 'node:crypto';

import { DEFAULT_THEME, isTheme, type Theme } from './theme';

// web.md Data: two cookies and no session. `curb_device` is the anonymous
// device id the API takes as X-Device-Id; `curb_theme` is which of the
// three themes to paint. Neither identifies a person and neither is read
// anywhere but here.

export const DEVICE_COOKIE = 'curb_device';
export const THEME_COOKIE = 'curb_theme';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const YEAR = 60 * 60 * 24 * 365;

export function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    const name = part.slice(0, index).trim();
    if (!name) continue;
    out[name] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return out;
}

export function readTheme(header: string | null): Theme {
  const value = parseCookies(header)[THEME_COOKIE];
  return isTheme(value) ? value : DEFAULT_THEME;
}

// A device id the client sent, or a fresh one. The caller sets the cookie
// when it minted one, so a crawler that ignores cookies never accumulates
// ids and a browser keeps one.
export function readDeviceId(header: string | null): { deviceId: string; minted: boolean } {
  const value = parseCookies(header)[DEVICE_COOKIE];
  if (value && UUID.test(value)) return { deviceId: value, minted: false };
  return { deviceId: randomUUID(), minted: true };
}

// The id a page's own API calls should carry. On a first visit the root
// loader mints one and sets the cookie, and a page loader that minted its
// own would send the API a different id from the one the reader keeps, so a
// request with no cookie sends none at all and the next one carries it.
export function deviceIdForRequest(header: string | null): string | null {
  const { deviceId, minted } = readDeviceId(header);
  return minted ? null : deviceId;
}

export function deviceCookie(deviceId: string): string {
  return [
    `${DEVICE_COOKIE}=${deviceId}`,
    'Path=/',
    `Max-Age=${YEAR}`,
    'SameSite=Lax',
    'HttpOnly',
    'Secure',
  ].join('; ');
}

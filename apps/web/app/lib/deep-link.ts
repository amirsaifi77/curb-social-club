// web.md R-10: the web app is read-only. Every action that needs an account
// opens the app for the same object, and falls back to the App Store when
// nothing answers. No write endpoint is ever called from here.

export const APP_SCHEME = 'curb://';
export const FALLBACK_MS = 1_500;

export function appStoreUrl(appStoreId: string | null): string | null {
  return appStoreId ? `https://apps.apple.com/app/id${appStoreId}` : null;
}

// The in-app path for the same thing the web page is showing, so the app
// opens on that meet rather than on its own home screen.
export function appUrlForPath(path: string): string {
  return `${APP_SCHEME}${path.replace(/^\/+/, '')}`;
}

export function isIos(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  // iPadOS 13 and later report as Macintosh with touch, which no user agent
  // string distinguishes; this is the half that can be read on the server.
  return /iPhone|iPad|iPod/i.test(userAgent);
}

// R-11: the in-app browsers that cannot install the app or follow a custom
// scheme reliably, so the page offers a visible way out.
export function isInAppBrowser(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return /Instagram|FBAN|FBAV|FB_IAB|Threads/i.test(userAgent);
}

export interface OpenInAppOptions {
  appUrl: string;
  storeUrl: string | null;
  now?: () => number;
  timeoutMs?: number;
}

// Try the app, then the store. The timer is cancelled when the page is
// hidden, because a backgrounded tab means the app took the link and
// sending Safari to the App Store on return would be a second, wrong jump.
export function openInApp(
  window: Window,
  { appUrl, storeUrl, timeoutMs = FALLBACK_MS }: OpenInAppOptions,
): () => void {
  const start = Date.now();
  let cancelled = false;

  const cancel = () => {
    cancelled = true;
  };
  const onHide = () => {
    if (window.document.visibilityState === 'hidden') cancel();
  };
  window.document.addEventListener('visibilitychange', onHide);
  window.addEventListener('pagehide', cancel);

  const timer = window.setTimeout(() => {
    window.document.removeEventListener('visibilitychange', onHide);
    window.removeEventListener('pagehide', cancel);
    // A long gap means the tab was suspended while the app opened, even if
    // no event fired: only a page that really stayed here goes to the store.
    if (cancelled || Date.now() - start > timeoutMs * 2) return;
    if (storeUrl) window.location.href = storeUrl;
  }, timeoutMs);

  window.location.href = appUrl;

  return () => {
    cancelled = true;
    window.clearTimeout(timer);
    window.document.removeEventListener('visibilitychange', onHide);
    window.removeEventListener('pagehide', cancel);
  };
}

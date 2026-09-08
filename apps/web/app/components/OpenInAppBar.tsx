import { useEffect, useState } from 'react';

import { appStoreUrl, appUrlForPath } from '~/lib/deep-link';

// web.md R-11 and the Copy table. Instagram, Facebook and Threads open
// links in a browser that cannot install an app, so the page offers the way
// out itself. Dismissing it is remembered for seven days, per reader, in
// localStorage: there is no account to hang it on and no cookie worth
// spending on it.

export const DISMISS_KEY = 'curb.open-in-app.dismissed-until';
export const DISMISS_DAYS = 7;

export const OPEN_IN_APP_COPY = {
  open: 'Open in curb',
  get: 'Get curb on the App Store',
  dismiss: 'Dismiss',
} as const;

export function dismissedUntil(raw: string | null, now: number): boolean {
  const until = Number(raw);
  return Number.isFinite(until) && until > now;
}

export function nextDismissal(now: number): number {
  return now + DISMISS_DAYS * 24 * 60 * 60 * 1000;
}

export interface OpenInAppBarProps {
  /** Rendered only when the server saw an in-app browser user agent. */
  show: boolean;
  path: string;
  appStoreId: string | null;
}

export function OpenInAppBar({ show, path, appStoreId }: OpenInAppBarProps) {
  // Starts hidden and appears after hydration: the dismissal lives in the
  // browser, and a bar that flashed before it could be read would be worse
  // than one that arrives a frame late.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!show) return;
    let dismissed = false;
    try {
      dismissed = dismissedUntil(window.localStorage.getItem(DISMISS_KEY), Date.now());
    } catch {
      // Private mode and blocked storage both throw; the bar still shows.
      dismissed = false;
    }
    setVisible(!dismissed);
  }, [show]);

  if (!visible) return null;

  const storeUrl = appStoreUrl(appStoreId);
  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(nextDismissal(Date.now())));
    } catch {
      // Nothing to remember it with; hiding it for this page load is all
      // that can be offered.
    }
    setVisible(false);
  };

  return (
    <div
      data-testid="open-in-app"
      className="flex items-center justify-between gap-3 border-b border-border bg-surfaceRaised px-gutter py-2 text-sm"
    >
      <a href={appUrlForPath(path)} className="font-medium underline">
        {OPEN_IN_APP_COPY.open}
      </a>
      {storeUrl ? (
        <a href={storeUrl} className="text-textSecondary underline">
          {OPEN_IN_APP_COPY.get}
        </a>
      ) : null}
      <button type="button" onClick={dismiss} className="text-textSecondary" aria-label="Dismiss">
        &times;
      </button>
    </div>
  );
}

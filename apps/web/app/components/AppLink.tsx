import { useCallback, useEffect, useRef, useState } from 'react';

import { appStoreUrl, appUrlForPath, openInApp } from '~/lib/deep-link';

// web.md R-10: the actions that need an account. On iOS the app is tried
// first and the App Store follows 1.5 s later; everywhere else the store is
// the whole answer. It is an anchor, so it works before hydration and a
// crawler sees a link rather than a button that does nothing.

export interface AppLinkProps {
  /** The in-app path, e.g. `/meets/lido-saturday`. */
  path: string;
  appStoreId: string | null;
  /** Read from the user agent on the server, so the href is right on the
   * first paint rather than only after hydration. */
  isIos: boolean;
  /** R-19: a cancelled date's CTA does not act. */
  disabled?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function AppLink({
  path,
  appStoreId,
  isIos,
  disabled = false,
  children,
  className,
}: AppLinkProps) {
  const storeUrl = appStoreUrl(appStoreId);
  const appUrl = appUrlForPath(path);
  const cleanup = useRef<(() => void) | null>(null);
  // Marks the point where the click handler is live, so a test can wait for
  // it instead of racing it, and so an e2e failure means a real regression.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    return () => cleanup.current?.();
  }, []);

  const onClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (disabled) {
        event.preventDefault();
        return;
      }
      if (typeof window === 'undefined') return;
      // Only iOS gets the scheme attempt: elsewhere the app does not exist,
      // and a failed custom-scheme navigation is a browser error page.
      if (!/iPhone|iPad|iPod/i.test(window.navigator.userAgent)) return;
      event.preventDefault();
      cleanup.current?.();
      cleanup.current = openInApp(window, { appUrl, storeUrl });
    },
    [appUrl, storeUrl, disabled],
  );

  // On iOS the href is the app itself, so a tap before hydration still
  // tries curb:// the way R-10 requires; the click handler only adds the
  // store fallback. Elsewhere the app does not exist and the store is the
  // whole answer, and without a store id the app link is all there is.
  const href = isIos ? appUrl : (storeUrl ?? appUrl);

  if (disabled) {
    return (
      <span className={className} aria-disabled="true" data-app-path={path}>
        {children}
      </span>
    );
  }

  return (
    <a
      href={href}
      onClick={onClick}
      className={className}
      data-app-path={path}
      {...(hydrated ? { 'data-testid': 'hydrated' } : {})}
    >
      {children}
    </a>
  );
}

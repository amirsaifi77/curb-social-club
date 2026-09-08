import { useCallback, useEffect, useRef } from 'react';

import { appStoreUrl, appUrlForPath, openInApp } from '~/lib/deep-link';

// web.md R-10: the actions that need an account. On iOS the app is tried
// first and the App Store follows 1.5 s later; everywhere else the store is
// the whole answer. It is an anchor, so it works before hydration and a
// crawler sees a link rather than a button that does nothing.

export interface AppLinkProps {
  /** The in-app path, e.g. `/meets/lido-saturday`. */
  path: string;
  appStoreId: string | null;
  children: React.ReactNode;
  className?: string;
}

export function AppLink({ path, appStoreId, children, className }: AppLinkProps) {
  const storeUrl = appStoreUrl(appStoreId);
  const appUrl = appUrlForPath(path);
  const cleanup = useRef<(() => void) | null>(null);

  useEffect(() => () => cleanup.current?.(), []);

  const onClick = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (typeof window === 'undefined') return;
      // Only iOS gets the scheme attempt: elsewhere the app does not exist,
      // and a failed custom-scheme navigation is a browser error page.
      if (!/iPhone|iPad|iPod/i.test(window.navigator.userAgent)) return;
      event.preventDefault();
      cleanup.current?.();
      cleanup.current = openInApp(window, { appUrl, storeUrl });
    },
    [appUrl, storeUrl],
  );

  // Without a store id there is nothing to fall back to, so the anchor is
  // the app link alone and a desktop reader gets no dead button.
  const href = storeUrl ?? appUrl;

  return (
    <a href={href} onClick={onClick} className={className} data-app-path={path}>
      {children}
    </a>
  );
}

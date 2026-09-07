import geistMedium from '@curb/design-tokens/fonts/Geist-Medium.woff2?url';
import geistRegular from '@curb/design-tokens/fonts/Geist-Regular.woff2?url';
import geistSemiBold from '@curb/design-tokens/fonts/Geist-SemiBold.woff2?url';
import instrumentSerif from '@curb/design-tokens/fonts/InstrumentSerif-Regular.woff2?url';
import tokensHref from '@curb/design-tokens/tokens.css?url';
import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from 'react-router';

import type { Route } from './+types/root';
import './app.css';

// The subset families from packages/design-tokens/fonts; Instrument Serif
// Italic deliberately never ships (design-system-and-theming.md R-11).
const FONT_FACES: Array<[family: string, href: string, weight: number]> = [
  ['Instrument Serif', instrumentSerif, 400],
  ['Geist', geistRegular, 400],
  ['Geist', geistMedium, 500],
  ['Geist', geistSemiBold, 600],
];

const fontFaceCss = FONT_FACES.map(
  ([family, href, weight]) =>
    `@font-face{font-family:"${family}";src:url("${href}") format("woff2");font-weight:${weight};font-style:normal;font-display:swap}`,
).join('');

export const links: Route.LinksFunction = () => [
  { rel: 'stylesheet', href: tokensHref },
  { rel: 'icon', type: 'image/png', href: '/favicon.png' },
  ...FONT_FACES.map(([, href]) => ({
    rel: 'preload',
    href,
    as: 'font',
    type: 'font/woff2',
    crossOrigin: 'anonymous' as const,
  })),
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <style dangerouslySetInnerHTML={{ __html: fontFaceCss }} />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = 'Something went wrong.';
  let details = 'Try again in a moment.';
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? 'Not found' : `Error ${error.status}`;
    details =
      error.status === 404 ? 'There is nothing at this address.' : error.statusText || details;
  } else if (import.meta.env.DEV && error instanceof Error) {
    details = error.message;
    stack = error.stack;
  }

  return (
    <main className="mx-auto max-w-readingMax px-gutter pt-16">
      <h1 className="font-display text-3xl">{message}</h1>
      <p className="mt-2 text-textSecondary">{details}</p>
      {stack && (
        <pre className="mt-4 overflow-x-auto rounded-sm border border-border p-4 text-xs">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}

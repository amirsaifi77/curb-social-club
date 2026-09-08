import geistMedium from '@curb/design-tokens/fonts/Geist-Medium.woff2?url';
import geistRegular from '@curb/design-tokens/fonts/Geist-Regular.woff2?url';
import geistSemiBold from '@curb/design-tokens/fonts/Geist-SemiBold.woff2?url';
import instrumentSerif from '@curb/design-tokens/fonts/InstrumentSerif-Regular.woff2?url';
import tokensHref from '@curb/design-tokens/tokens.css?url';
import {
  data,
  isRouteErrorResponse,
  Link,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useRouteLoaderData,
} from 'react-router';

import type { Route } from './+types/root';
import './app.css';

import { deviceCookie, readDeviceId, readTheme } from '~/lib/cookies.server';
import { WEB_COPY } from '~/lib/copy';
import { publicEnv } from '~/lib/env.server';
import { DEFAULT_THEME } from '~/lib/theme';

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

// R-22: the theme comes from a cookie and the scheme from the reader's own
// system. tokens.css paints Marine Layer on bare `:root` with a
// prefers-color-scheme block, so the default theme needs no attributes at
// all and works with scripting off. The other two are addressed as
// [data-theme][data-scheme], and only the browser knows the scheme, so this
// sets it before first paint and keeps it in sync.
const SCHEME_SCRIPT = `(function(){var r=document.documentElement;if(!r.dataset.theme)return;var m=window.matchMedia('(prefers-color-scheme: dark)');var set=function(){r.dataset.scheme=m.matches?'dark':'light'};set();m.addEventListener('change',set)})()`;

export async function loader({ request }: Route.LoaderArgs) {
  const cookie = request.headers.get('cookie');
  const { deviceId, minted } = readDeviceId(cookie);
  const theme = readTheme(cookie);
  const headers = minted ? { 'Set-Cookie': deviceCookie(deviceId) } : undefined;
  return data({ theme, env: publicEnv() }, headers ? { headers } : undefined);
}

export function Layout({ children }: { children: React.ReactNode }) {
  const rootData = useRouteLoaderData<typeof loader>('root');
  const theme = rootData?.theme ?? DEFAULT_THEME;
  // Marine Layer is what tokens.css already paints; naming it would demand
  // a data-scheme the server cannot know.
  const themed = theme === DEFAULT_THEME ? {} : { 'data-theme': theme, 'data-scheme': 'light' };

  return (
    <html lang="en" {...themed}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <style dangerouslySetInnerHTML={{ __html: fontFaceCss }} />
        {theme === DEFAULT_THEME ? null : (
          <script dangerouslySetInnerHTML={{ __html: SCHEME_SCRIPT }} />
        )}
      </head>
      <body className="min-h-screen">
        <SiteHeader />
        {children}
        <SiteFooter />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

// R-23: the one glass surface on the web. Everything below it is flat, with
// hairlines and solid fills (brand-guide section 4).
function SiteHeader() {
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-glassTint backdrop-blur-[20px] backdrop-saturate-[1.1]">
      <div className="mx-auto flex max-w-pageMax items-center justify-between px-gutter py-3">
        <Link to="/" className="font-display text-2xl leading-none">
          curb
        </Link>
        <nav>
          <Link to="/meets" className="text-sm text-textSecondary hover:text-textPrimary">
            Meets
          </Link>
        </nav>
      </div>
    </header>
  );
}

// web.md Copy, "Footer". The legal pages are Phase 2 (W16), so the line
// carries the address that works today and no links to routes that 404.
function SiteFooter() {
  return (
    <footer className="mx-auto max-w-pageMax px-gutter py-10 text-sm text-textSecondary">
      <a href="mailto:hello@curbsocial.club">hello@curbsocial.club</a>
    </footer>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = 'Something went wrong.';
  let details = 'Try again in a moment.';
  let stack: string | undefined;

  // web.md Copy, the 404 and 410 rows. The nearby cards those rows promise
  // land with 1.17; the sentences are these pages' own either way.
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      message = WEB_COPY.notFoundHeadline;
      details = WEB_COPY.notFoundBody;
    } else if (error.status === 410) {
      message = WEB_COPY.goneHeadline;
      details = WEB_COPY.goneNearby;
    } else {
      message = `Error ${error.status}`;
      details = error.statusText || details;
    }
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

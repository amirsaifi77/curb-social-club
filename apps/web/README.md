# @curb/web

React Router v7 (framework mode, SSR) web app for Curb Social Club, generated in session 0.8. See ADR 0005 for why React Router over Next.js.

## How it was generated

The planned command was `pnpm dlx create-react-router@latest web --template remix-run/react-router-templates/vercel`. That template was removed upstream on 2025-09-26 and the templates repo now targets React Router 8, so the app was generated from the template's last revision instead:

```sh
git clone https://github.com/remix-run/react-router-templates && git -C react-router-templates checkout 29ac272
cd apps && pnpm dlx create-react-router@latest web --template ../react-router-templates/vercel --no-install --no-git-init
```

Then bumped to React Router 7.18 and `@vercel/react-router` 1.3 (which still targets v7), wired to `@curb/config` (eslint, prettier, tsconfig), `@curb/design-tokens` (`tokens.css`, the subset fonts, and `tailwind.theme` through `tailwind.config.ts`), Sentry (`@sentry/react-router`), vitest, and Playwright. `@curb/api-client` joins in session 0.9 when the generated types exist; until then `app/lib/api.server.ts` reads `VITE_API_URL` and calls `/v1/health` with plain fetch.

## Deployment

Vercel project `curb-social-club` (Hobby, Node 24) linked to the GitHub repo. It needs Root Directory set to `apps/web` in the project settings once; `apps/web/vercel.json` then supplies the framework preset and the Turborepo build command, and every push gets a preview (production on `main`). Until that setting exists the root `vercel.json` keeps git deployments off, because a build from the repo root has no app to build. Environment variables on the project: `VITE_API_URL` (the Render staging API), `VITE_SENTRY_DSN`, `SENTRY_DSN`; see `.env.example`.

## Planned structure

```
apps/web/
  app/
    routes.ts
    root.tsx                  # tokens CSS, subset fonts, error boundary
    entry.client.tsx          # hydration plus Sentry browser init (VITE_SENTRY_DSN)
    entry.server.tsx          # Vercel request handler plus Sentry server init (SENTRY_DSN)
    app.css                   # Tailwind v4 with @config tailwind.config.ts (token theme)
    routes/
      home.tsx                # placeholder until W01: wordmark, copy, API reachability from the loader
      sentry-test.tsx         # throws when SENTRY_TEST_ENABLED=1, otherwise 404
      _index.tsx              # W01 nearby upcoming, IP geolocation fallback to coastal Orange County
      meets._index.tsx        # W02 search and list
      meets.$slug.tsx         # W03 event detail, meta + JSON-LD Event, primary SEO page
      meets.$slug.$occurrenceId.tsx   # W04
      map.tsx                 # W05 client-only MapLibre with supercluster
      u.$handle.tsx           # W06 profile, garage, clubs, hosted events
      clubs._index.tsx        # W07 club directory
      clubs.$slug.tsx         # W08 club page, JSON-LD Organization
      sponsors.$slug.tsx      # W09 sponsor page
      spots._index.tsx        # W10 spot directory (Phase 4)
      spots.$slug.tsx         # W11 spot page, JSON-LD Place (Phase 4)
      socal.$city.tsx         # W12 city page
      posts.$id.tsx           # W13 post page, Instagram embed script only here (Phase 4)
      og.meets.$slug[.png].tsx    # W14 OG card resource route (Satori); ?format=story for the 9:16 card
      og.spots.$slug[.png].tsx    # W14 (Phase 4)
      sitemap[.xml].tsx       # W15, built from GET /v1/sitemap
      robots[.txt].tsx
      [.well-known].apple-app-site-association.tsx
      terms.tsx, privacy.tsx, guidelines.tsx, bot.tsx, unsubscribe.$token.tsx   # W16
      # Phase 7 (W17): sign-in.tsx, new.tsx, imports.$id.tsx, clubs.$slug.manage.tsx
    lib/
      api.server.ts           # VITE_API_URL and /v1/health today; createClient for loaders from 0.9, forwards session cookie as Bearer
      session.server.ts       # cookie session storage for the API token
      seo.ts                  # meta helpers, JSON-LD builders
    components/
  e2e/home.spec.ts            # Playwright smoke test against the dev server
  public/favicon.png
  react-router.config.ts      # ssr: true, vercel preset
  vite.config.ts, vitest.config.ts, playwright.config.ts, tailwind.config.ts
  vercel.json                 # framework react-router, turbo build command (Root Directory apps/web)
  turbo.json                  # build env: VITE_API_URL, VITE_SENTRY_DSN
  package.json
```

## Responsibilities

| Concern | Approach |
|---|---|
| SEO | Loader-rendered event pages, `meta` exports, JSON-LD `Event` with `eventSchedule` for recurring meets, sitemap from the API |
| Share cards | `/og/meets/:slug.png` rendered with Satori, cached at the edge for 1 h |
| Universal links | Serve `apple-app-site-association` for the iOS app |
| Maps | MapLibre GL JS with a free tile source, `supercluster` wrapper from `@curb/ui` |
| Auth | None at launch: the public site is read-only (gaps item 10). RSVP and create deep link into the app or the App Store. Phase 7 adds an API session token in an httpOnly cookie managed by the SSR server |
| Data | `@curb/api-client` in loaders (server) and TanStack Query hooks (client) |

## Commands

| Command | What |
|---|---|
| `pnpm --filter @curb/web dev` | dev server on 5173 |
| `pnpm --filter @curb/web build` | production build |
| `pnpm --filter @curb/web typecheck` | `react-router typegen && tsc` |
| `pnpm --filter @curb/web test` | vitest (`app/**/*.test.ts`) |
| `pnpm --filter @curb/web test:e2e` | Playwright smoke test; starts the dev server on 5173. CI installs Chromium first; locally set `PLAYWRIGHT_CHROMIUM_PATH` to reuse an installed Chromium or run `pnpm --filter @curb/web exec playwright install chromium` |
| `pnpm --filter @curb/web lint` | eslint |

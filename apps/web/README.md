# @curb/web

React Router v7 (framework mode, SSR) web app for Curb Social Club. Not generated yet. See ADR 0005 for why React Router over Next.js.

## Generate

```sh
cd apps
pnpm dlx create-react-router@latest web --template remix-run/react-router-templates/vercel
```

Then wire `@curb/config` (eslint, prettier, tsconfig), `@curb/api-client`, `@curb/design-tokens`, and set `VITE_API_URL`.

## Planned structure

```
apps/web/
  app/
    routes.ts
    root.tsx                  # tokens CSS, theme, error boundary
    routes/
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
      api.server.ts           # createClient for loaders, forwards session cookie as Bearer
      session.server.ts       # cookie session storage for the API token
      seo.ts                  # meta helpers, JSON-LD builders
    components/
  public/
  react-router.config.ts      # ssr: true, vercel preset
  vite.config.ts
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
| `pnpm --filter @curb/web test` | vitest |

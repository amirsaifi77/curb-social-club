# @cac/web

React Router v7 (framework mode, SSR) web app for Cars and Coffee. Not generated yet. See ADR 0005 for why React Router over Next.js.

## Generate

```sh
cd apps
pnpm dlx create-react-router@latest web --template remix-run/react-router-templates/vercel
```

Then wire `@cac/config` (eslint, prettier, tsconfig), `@cac/api-client`, `@cac/design-tokens`, and set `VITE_API_URL`.

## Planned structure

```
apps/web/
  app/
    routes.ts
    root.tsx                  # tokens CSS, theme, error boundary
    routes/
      _index.tsx              # nearby upcoming, IP geolocation fallback to Inland Empire
      meets._index.tsx        # search and list
      meets.$slug.tsx         # event detail, meta + JSON-LD Event, primary SEO page
      meets.$slug.$occurrenceId.tsx
      map.tsx                 # client-only MapLibre with supercluster
      u.$handle.tsx           # profile, garage, hosted events
      new.tsx                 # create or paste a link
      imports.$id.tsx         # draft editor with polling
      sign-in.tsx             # Apple JS + Google Identity Services
      og.meets.$slug[.png].tsx    # OG card resource route (Satori)
      sitemap[.xml].tsx
      robots[.txt].tsx
      [.well-known].apple-app-site-association.tsx
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
| Maps | MapLibre GL JS with a free tile source, `supercluster` wrapper from `@cac/ui` |
| Auth | API session token in an httpOnly cookie managed by the SSR server |
| Data | `@cac/api-client` in loaders (server) and TanStack Query hooks (client) |

## Commands

| Command | What |
|---|---|
| `pnpm --filter @cac/web dev` | dev server on 5173 |
| `pnpm --filter @cac/web build` | production build |
| `pnpm --filter @cac/web typecheck` | `react-router typegen && tsc` |
| `pnpm --filter @cac/web test` | vitest |

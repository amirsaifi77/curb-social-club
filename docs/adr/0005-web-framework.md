# ADR 0005: React Router v7 framework mode over Next.js

Date: 2026-09-05. Status: Proposed (confirm with Amir).

## Context

The web app is the second surface. Its jobs, in priority order: crawlable event pages that rank for "cars and coffee <city>", rich unfurls when a meet link is shared in iMessage or Instagram, a usable browse and map experience, and the same create and import flows as mobile. The brief allows Vite plus React Router or Next.js and asks for a recommendation.

Both frameworks can do SSR, meta tags, and OG image routes. The question is how much framework the project should carry.

## Decision

React Router v7 in framework mode (file routes, loaders, actions, SSR with streaming) built by Vite, deployed to Vercel via the official `@vercel/react-router` preset.

Reasons:

| Factor | React Router v7 | Next.js (App Router) |
|---|---|---|
| SEO for event pages | Loader-rendered HTML, `meta` export, JSON-LD in route; fully sufficient | Same capability |
| OG cards | Resource route returning a PNG (Satori) | `ImageResponse` from `next/og` (nicer built-in) |
| Conceptual surface | Routes, loaders, actions, components | RSC, server actions, caching layers, route segment config, middleware |
| Data source | Our Rails API through the shared client in loaders | Same, but RSC encourages server-side fetching patterns that duplicate the API client boundary |
| Dev speed | Vite HMR, fast | Turbopack, fast |
| Lock-in | Low; routes and loaders are portable | Higher; RSC and caching are Next specific |
| Vercel fit | First-class preset | Native |
| Shared tooling with mobile | Vite config reused for package tests; routing concepts similar to Expo Router | Different build tool |

The web app is small and the data lives behind a Rails API. React Router v7 keeps the web app close to "React plus a router" while still giving SSR. Fewer concepts means faster Claude Code sessions and fewer surprises for a builder whose main focus is mobile.

## Alternatives

| Option | Why not |
|---|---|
| Next.js App Router | Excellent, but more framework than the product needs; RSC and caching semantics are a learning tax with no payoff here. Choose it if a marketing site with MDX, heavy image optimization, or a Next-fluent collaborator appears. |
| Next.js Pages Router | Legacy direction. |
| Vite SPA with prerendering | OG unfurls need server rendering for dynamic events; prerendering thousands of event pages on a schedule is fragile. |
| TanStack Start | Promising, but younger; revisit in a year. |
| Astro with React islands | Great for content, weaker for the app parts (map, import editor). |

## Consequences

Positive: small mental model, SSR where it matters, shared api-client used in loaders and components, easy path to add Android web fallbacks for deep links.

Negative: OG image generation needs a bit more wiring than `next/og`. React Router framework mode has a smaller ecosystem of tutorials than Next. If Amir prefers Next.js for familiarity, nothing else in the architecture changes; only this ADR flips.

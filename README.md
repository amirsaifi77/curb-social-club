# Cars and Coffee

A discovery and social platform for finding and sharing local car meets. On weekends, car owners and enthusiasts organize coffee meetups that function as car meets. Cars and Coffee aims to be the go-to place to find them, say you are going, and share photos afterward.

iOS app first, web second. Launching in Southern California's Inland Empire (Fontana, Rancho Cucamonga, Riverside, Ontario) and expanding to Orange County and LA.

Status: planning. This repository currently holds documentation and configuration only. Application code is generated in follow-up PRs per the plan in `docs/`.

## Principles

| Principle | What it means in practice |
|---|---|
| Easy and useful, not exclusive | Browse everything without an account. An account is needed only to post, RSVP, follow, or comment. |
| Meet people where they are | Meets are organized on Instagram, Facebook, Evite, group chats, and flyers. The app imports from and links out to those sources instead of competing with them. |
| Signature feature | Paste a link or snap a flyer, get a draft event. Pluggable importers with an LLM fallback. |
| Boring infrastructure | One Rails API, one Postgres, managed hosting. Optimize for a solo builder with limited hours. |
| Monetization deferred | Functionality and utility first. |

## Stack

| Layer | Technology |
|---|---|
| Backend | Ruby on Rails 8 (API-only), Postgres 16 + PostGIS, Solid Queue, Solid Cache, Active Storage on Cloudflare R2 |
| Web | React, TypeScript, React Router v7 (framework mode, SSR), Vite, Vercel |
| Mobile | React Native with Expo (latest SDK), Expo Router, TypeScript, iOS 26 Liquid Glass |
| Shared | pnpm workspaces + Turborepo, OpenAPI-generated types, design tokens, shared API client |
| Hosting | Render (API, workers, Postgres), Vercel (web), Cloudflare (DNS, R2) |
| Auth | Sign in with Apple, Google Sign-In, opaque session tokens |

## Repo map

```
apps/
  api/        Rails 8 API (Ruby; pnpm installs nothing here)
  web/        React Router v7 web app
  mobile/     Expo app
packages/
  api-client/     Typed fetch client and TanStack Query hooks
  types/          TypeScript types generated from the API's OpenAPI spec
  design-tokens/  tokens.json source of truth and generated outputs
  ui/             Shared logic and headless components (see README for scope)
  config/         Shared eslint, prettier, tsconfig
docs/             Architecture, data model, API, importer, ADRs, plans, research
brand/            Brand guide, tokens, logo and icon assets, screen previews, Figma scripts
tooling/          Repo-level scripts
.github/          CI workflows and templates
```

## Getting started

The apps are not generated yet. When they are, the flow will be:

```sh
mise install            # Node 22 and Ruby 3.3 from .nvmrc and .ruby-version
pnpm install
docker compose up -d    # Postgres + PostGIS
pnpm --filter @cac/api build
pnpm dev
```

See [docs/local-development.md](docs/local-development.md) for the full planned setup.

## Docs

| Doc | Purpose |
|---|---|
| [docs/architecture.md](docs/architecture.md) | The system, end to end |
| [docs/data-model.md](docs/data-model.md) | Tables, columns, indexes |
| [docs/api.md](docs/api.md) | REST v1 reference draft |
| [docs/importer.md](docs/importer.md) | Link and flyer import pipeline |
| [docs/adr/](docs/adr/) | Decision records |
| [docs/mobile-liquid-glass.md](docs/mobile-liquid-glass.md) | Liquid Glass on Expo and the mobile architecture |
| [docs/business-plan.md](docs/business-plan.md) | Proposal and business plan |
| [docs/app-overview.md](docs/app-overview.md) | What the app does, surface by surface |
| [docs/development-plan.md](docs/development-plan.md) | Phased development plan |
| [docs/gaps-and-open-questions.md](docs/gaps-and-open-questions.md) | Open decisions |
| [docs/research/market-research.md](docs/research/market-research.md) | Market and competitor research |
| [brand/brand-guide.md](brand/brand-guide.md) | Brand guide and design assets |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Branching, commits, PRs |
| [CLAUDE.md](CLAUDE.md) | Conventions for Claude Code sessions |

## License

Private. All rights reserved. See [LICENSE](LICENSE).

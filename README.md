# Curb Social Club

A discovery and social platform for finding and sharing local car meets. On weekend mornings, car owners and enthusiasts gather for cars and coffee meets in lots and outside coffee shops. Curb Social Club (Curb Social in conversation, "curb" in the app) aims to be the place to find them, say you are going, and share photos afterward.

iOS app first, web second. Launching in coastal Orange County (Newport Beach, Corona del Mar, Laguna Beach, Dana Point, San Clemente) with the Inland Empire as the second ring, then LA and San Diego.

Status: planning. This repository currently holds documentation and configuration only. Application code is generated in follow-up PRs per the plan in `docs/`. The product was renamed from its working title on 2026-09-05; see [docs/adr/0009-rebrand-to-curb-social-club.md](docs/adr/0009-rebrand-to-curb-social-club.md).

## Naming

| Form | Use |
|---|---|
| Curb Social Club | Formal: App Store title, legal, wordmark lockup, doc titles |
| Curb Social | Conversational: prose, press, social bios |
| curb | In-app brand, always lowercase: wordmark, tab bar, URL scheme, Expo slug |
| cars and coffee | The event category, lowercase, never the product ("find cars and coffee meets near you") |

## Principles

| Principle | What it means in practice |
|---|---|
| Easy and useful, not exclusive | Browse everything without an account. An account is needed only to post, RSVP, follow, or comment. Every meet is listed and every car is welcome; the brand is a tone, not a velvet rope. |
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
| Shared | pnpm workspaces + Turborepo, OpenAPI-generated types, design tokens (three flat themes, light and dark), shared API client |
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
  design-tokens/  tokens.json source of truth (three themes) and generated outputs
  ui/             Shared logic and headless components (see README for scope)
  config/         Shared eslint, prettier, tsconfig
docs/             Architecture, data model, API, importer, ADRs, plans, research
brand/            Brand guide, tokens, logos, icons, previews, Figma
tooling/          Repo-level scripts
.github/          CI workflows and templates
```

## Getting started

The apps are not generated yet. When they are, the flow will be:

```sh
mise install            # Node 22 and Ruby 3.3 from .nvmrc and .ruby-version
pnpm install
docker compose up -d    # Postgres + PostGIS
pnpm --filter @curb/api build
pnpm dev
```

See [docs/local-development.md](docs/local-development.md) for the full planned setup.

## Docs

| Doc | Purpose |
|---|---|
| [docs/STATUS.md](docs/STATUS.md) | Entry point: what exists, what was decided, what is next |
| [docs/architecture.md](docs/architecture.md) | The system, end to end |
| [docs/data-model.md](docs/data-model.md) | Tables, columns, indexes |
| [docs/api.md](docs/api.md) | REST v1 reference draft |
| [docs/importer.md](docs/importer.md) | Link and flyer import pipeline |
| [docs/adr/](docs/adr/) | Decision records |
| [docs/mobile-liquid-glass.md](docs/mobile-liquid-glass.md) | Liquid Glass on Expo and the mobile architecture |
| [docs/business-plan.md](docs/business-plan.md) | Proposal, brand direction, and business plan |
| [docs/app-overview.md](docs/app-overview.md) | What the app does, surface by surface |
| [docs/development-plan.md](docs/development-plan.md) | Phased development plan |
| [docs/gaps-and-open-questions.md](docs/gaps-and-open-questions.md) | Open decisions |
| [docs/research/market-research.md](docs/research/market-research.md) | Market and competitor research, trademark records, seed inventory |
| [brand/brand-guide.md](brand/brand-guide.md) | Brand guide: themes, type, voice, logo directions, Liquid Glass rules |
| [brand/](brand/) | `tokens.json`, `logos/`, `icons/`, `previews/`, `figma/` |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Branching, commits, PRs |
| [CLAUDE.md](CLAUDE.md) | Conventions for Claude Code sessions |

## License

Private. All rights reserved. See [LICENSE](LICENSE).

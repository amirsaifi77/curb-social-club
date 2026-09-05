# CLAUDE.md

Conventions for Claude Code sessions in this repository. Read `docs/architecture.md` before making structural changes.

## What this is

Curb Social Club (Curb Social in prose, "curb" in the app; formerly the working title Cars and Coffee, see ADR 0009): a discovery and social platform for local car meets. iOS first, web second. Monorepo with a Rails 8 API, a React Router v7 web app, an Expo mobile app, and shared TypeScript packages. Solo maintainer (Amir), nights and weekends. Keep changes small and boring.

## Stack

| Layer | Stack |
|---|---|
| apps/api | Rails 8.1 API-only, Ruby 3.3, Postgres 16 + PostGIS, Solid Queue, Solid Cache, Active Storage on R2, Alba serializers, Pundit, Pagy, rswag, rack-attack, ice_cube |
| apps/web | React 19, TypeScript, React Router v7 framework mode (SSR), Vite, Vercel |
| apps/mobile | Expo (latest SDK), Expo Router, TypeScript, iOS 26 Liquid Glass, EAS |
| packages | api-client (openapi-fetch + TanStack Query), types (openapi-typescript output), design-tokens (tokens.json), ui (logic and headless only), config (eslint, prettier, tsconfig) |
| Tooling | pnpm 9 workspaces, Turborepo 2, GitHub Actions, mise for Node 22 and Ruby 3.3 |

## Commands

| Task | Command |
|---|---|
| Install | `pnpm install` (JS only; Ruby via `pnpm --filter @curb/api build`) |
| Database | `docker compose up -d` |
| Everything | `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` |
| API | `pnpm --filter @curb/api test`, `pnpm --filter @curb/api lint`, `pnpm --filter @curb/api openapi` |
| Rails directly | `cd apps/api && bin/rails ...` |
| Types | `pnpm --filter @curb/types generate` after any API spec change; commit the output |
| Tokens | `pnpm --filter @curb/design-tokens build` |

## Rules

| Rule | Detail |
|---|---|
| Do not hand-edit generated files | `packages/types/src/generated.d.ts`, `apps/api/swagger/v1/openapi.yaml`, `packages/design-tokens/dist/**` |
| API changes come with request specs | rswag request specs are the OpenAPI source. No endpoint without a spec. |
| Anonymous read access | Public read endpoints must work without a token. Never add auth to a read endpoint without checking the product principle in `README.md`. |
| Geo | Store `geography(Point,4326)`. Query with `ST_DWithin` or bbox. Never do distance math in Ruby. |
| Occurrences, not events | RSVPs, check-ins, and posts attach to `event_occurrences`. |
| Location privacy | Round browse coordinates to 2 decimals client-side. Never persist raw check-in coordinates. Strip EXIF on upload. |
| Importer | One fetch per user request. No crawling, no login, honor the Fetcher limits. Every adapter returns a `DraftEvent` with per-field confidence. |
| Migrations | Use `structure.sql`. Add indexes concurrently in production. UUID primary keys. |
| Commits | Conventional Commits, squash merge. `feat(api): ...`, `fix(mobile): ...`, `docs: ...`. |
| Docs style | Concise prose, headers, tables. No em dashes anywhere in the repo (use commas, periods, parentheses). No emoji. |
| Product name | "Curb Social Club" in formal contexts, "Curb Social" in prose, "curb" (lowercase) in the app, wordmark, URL scheme, and Expo slug. "cars and coffee" is the event category and stays lowercase; capitalize it only for a specific real-world event (South OC Cars and Coffee). Never call the product Cars and Coffee. |
| Brand and UI copy | Calm, specific, dry. Name the place and the time. No hype words, no exclusivity language, no car silhouettes or coffee-cup cliches in marks. Flat rendering: solid fills, thin rules, no gradients or glows. See `brand/brand-guide.md`. |
| Secrets | Never commit `.env` or keys. Use `.env.example` for new variables. |
| Dependencies | Ask before adding a gem or npm package that adds a service dependency (Redis, another SaaS). |

## Where things live

| Thing | Path |
|---|---|
| Architecture | `docs/architecture.md` |
| Tables and columns | `docs/data-model.md` |
| Endpoints | `docs/api.md` (draft) and `apps/api/swagger/v1/openapi.yaml` (source of truth once generated) |
| Importer adapters | `apps/api/app/services/importers/` (planned) |
| Decisions | `docs/adr/` |
| Mobile design | `docs/mobile-liquid-glass.md` |
| Brand | `brand/brand-guide.md`, tokens in `packages/design-tokens/tokens.json` (three themes: Marine Layer default, Harbor, Olive and Ivory; each light and dark) |
| Status and next steps | `docs/STATUS.md` |

## Current state

Planning phase. Apps are not generated yet. The first implementation PRs should be: `rails new` for `apps/api`, `create-react-router` for `apps/web`, `create-expo-app` for `apps/mobile`, each matching the README in that folder.

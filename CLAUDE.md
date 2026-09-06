# CLAUDE.md

Conventions for Claude Code sessions in this repository. Read this file first in every session, then `docs/specs/README.md`, then the spec and session block you were given. Read `docs/architecture.md` before making structural changes.

## What this is

Curb Social Club (Curb Social in prose, "curb" in the app; formerly the working title Cars and Coffee, see ADR 0009): a discovery and social platform for local car meets. iOS first, web second. Monorepo with a Rails 8 API, a React Router v7 web app, an Expo mobile app, and shared TypeScript packages. Solo maintainer (Amir), nights and weekends. Keep changes small and boring.

## How a session works

| Step | Rule |
|---|---|
| Scope | A session builds one slice of one spec in `docs/specs/`, named in its block in `docs/sessions.md`. Requirements outside the slice are context, not work. |
| Read first | `CLAUDE.md`, `docs/specs/README.md`, the spec, then the data model and API sections the spec cites. Do not start writing before reading them. |
| Done | Every acceptance criterion listed under "Must pass" passes. The PR description lists each AC id and how it was checked, and pastes the tail of the "Verify" commands. |
| Spec drift | If the spec is wrong or silent, make the smallest reasonable decision, edit the spec in the same PR, and list the edit under "Spec changes" in the PR description. Code and spec agree at merge. |
| Stopping | Out of time means a PR with a "Stopping note" describing what is done, what is not, and the next step. Never leave an unpushed branch. |
| One branch | One feature branch at a time, named per `CONTRIBUTING.md`. Squash merge. |

## Stack

| Layer | Stack |
|---|---|
| apps/api | Rails 8.1 API-only, Ruby 3.3, Postgres 16 + PostGIS, Solid Queue, Solid Cache, Active Storage on R2, Alba serializers, Pundit, Pagy, rswag, rack-attack, ice_cube. Admin UI is hand-written ERB under `/admin` (no admin gem). |
| apps/web | React 19, TypeScript, React Router v7 framework mode (SSR), Vite, Vercel. Read-only public site at launch. |
| apps/mobile | Expo (SDK 57 now, 58 when stable), Expo Router, TypeScript, iOS 26 Liquid Glass, Unistyles 3, react-native-maps on Apple Maps, TanStack Query, EAS. Four native tabs: Home, Map, Create, Me. |
| packages | api-client (openapi-fetch + TanStack Query), types (openapi-typescript output), design-tokens (tokens.json, three themes in light and dark), ui (logic and headless only, no rendering code), config (eslint, prettier, tsconfig) |
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
| Tokens | `pnpm --filter @curb/design-tokens build`; `dist/` is gitignored and built by Turborepo before consumers |
| Docs style | `bash tooling/check-em-dashes.sh` |

## Rules

| Rule | Detail |
|---|---|
| Do not hand-edit generated files | `packages/types/src/generated.d.ts` and `apps/api/swagger/v1/openapi.yaml` (committed); `packages/design-tokens/dist/**` (gitignored, built) |
| API changes come with request specs | rswag request specs are the OpenAPI source. No endpoint without a spec. `docs/api.md` is the contract until the generated spec exists; keep them in step. |
| Anonymous read access | Public read endpoints must work without a token. Never add auth to a read endpoint without checking the product principle in `README.md`. |
| One host shape | An event's host is a `User`, `Club`, or `Sponsor` (`events.host_type`, ADR 0010). Serializers return one `Host` shape (`type`, `id`, `slug`, `name`, `avatar_url`, `verified`, `kind`). Clients branch on `type` only for the link target. `events.host_name` is denormalized on save. |
| Follow | `follows.followable_type` is `User`, `Club`, `Sponsor`, or `Event`. Following a club is not membership. |
| Geo | Store `geography(Point,4326)`. Query with `ST_DWithin` or bbox. Never do distance math in Ruby. Browse radius default 32 km. |
| Occurrences, not events | RSVPs, check-ins, and posts attach to `event_occurrences`. |
| Location privacy | Round browse coordinates to 2 decimals client-side. Never persist raw check-in coordinates. Strip EXIF on upload. A photo's spot is opt-in per photo and never derived from EXIF. |
| External media | Instagram images are never fetched, stored, or copied (ADR 0011). Instagram posts hold a URL and render through oEmbed with a 24 h cache; they never appear in OG images or story cards. |
| Importer | One fetch per user request. No crawling, no login, honor the Fetcher limits. Never fetch Evite event pages or Meta pages; those sources are text-only. Every adapter returns a `DraftEvent` with per-field confidence. |
| Admin | Hand-written ERB views under `app/controllers/admin` and `app/views/admin`, cookie sessions, `admin` and `moderator` roles only, every write audited in `admin_audits`. Do not add an admin gem. |
| Feature flags | `config/features.yml`, read at boot. `clubs_self_service`, `sponsors_self_service`, and `instagram_posts` gate post-launch and approval-dependent surfaces; gated write endpoints return 403 `not_enabled`. |
| Migrations | Use `structure.sql`. Add indexes concurrently in production. UUID primary keys. |
| Commits | Conventional Commits, squash merge. `feat(api): ...`, `fix(mobile): ...`, `docs: ...`. |
| Docs style | Concise prose, headers, tables. No em dashes anywhere in the repo (use commas, periods, parentheses). No emoji. |
| Product name | "Curb Social Club" in formal contexts, "Curb Social" in prose, "curb" (lowercase) in the app, wordmark, URL scheme, and Expo slug. "cars and coffee" is the event category and stays lowercase; capitalize it only for a specific real-world event (South OC Cars and Coffee). Never call the product Cars and Coffee. |
| Brand and UI copy | Calm, specific, dry. Name the place and the time. No hype words, no exclusivity language, no car silhouettes or coffee-cup cliches in marks. Flat rendering: solid fills, thin rules, no gradients or glows; glass only on system chrome. Exact strings live in each spec's Copy table. See `brand/brand-guide.md`. |
| Secrets | Never commit `.env` or keys. Use `.env.example` for new variables. |
| Dependencies | Ask before adding a gem or npm package that adds a service dependency (Redis, another SaaS). |

## Where things live

| Thing | Path |
|---|---|
| Feature specs (requirements, ACs, session slices) | `docs/specs/` with `README.md` as the index and `_template.md` for new ones |
| Screen inventory (ids, routes, phases, states) | `docs/screens.md` |
| Session prompts | `docs/sessions.md` |
| Phases and dates | `docs/development-plan.md` |
| Architecture | `docs/architecture.md` |
| Tables and columns | `docs/data-model.md` |
| Endpoints | `docs/api.md` (draft) and `apps/api/swagger/v1/openapi.yaml` (source of truth once generated) |
| Importer adapters | `apps/api/app/services/importers/` (planned) |
| Decisions | `docs/adr/` |
| Mobile design | `docs/mobile-liquid-glass.md` |
| Brand | `brand/brand-guide.md`, tokens in `packages/design-tokens/tokens.json` (three themes: Marine Layer default, Harbor, Olive and Ivory; each light and dark) |
| Status and next steps | `docs/STATUS.md` |
| Session output | Everything Claude produces for this project (docs, research, brand assets, previews, specs) is saved inside this repo so it can be committed. Never write to the parent folder `~/Documents/Curb/`. |

## Current state

Planning complete as of 2026-09-06; apps are not generated yet. The first implementation sessions are `docs/sessions.md` 0.1 (workspace scaffold), 0.2 (`rails new` for `apps/api`), 0.4 (`create-expo-app` for `apps/mobile`), and 0.8 (`create-react-router` for `apps/web`), each matching the README in that folder.

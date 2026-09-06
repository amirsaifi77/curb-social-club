# Claude Code Sessions

Status: v0.1, 2026-09-06. The session prompts for Phase 0 and Phase 1, written out in full, plus the template Sunday planning uses to write the next ones. Each session is one scoped slice of one spec in `docs/specs/`, sized for one weeknight (two to three hours), and ends in a PR. `docs/development-plan.md` holds the phases and dates; this file holds the work.

## How to run a session

1. Open Claude Code in the repo root on a fresh branch named in the session.
2. Paste the preamble below, then the session block. Nothing else; the spec carries the detail.
3. Let the session read the files it is told to read before it writes anything.
4. When the PR is open, review it on Sunday, merge or write a stopping note, and mark the spec's slice in `docs/STATUS.md`.

Rules that keep this honest: one branch at a time; a session that runs out of time ends with a stopping note in the PR description, never with an unpushed branch; a spec that turns out wrong is fixed in the same PR and the fix is called out; nothing outside the slice, even when it is tempting.

## Preamble (paste first, every time)

```
You are working in the Curb Social Club monorepo (Rails 8 API, Expo mobile, React Router web). Read CLAUDE.md, then docs/specs/README.md, then the files listed under "Read first" in the session block below, before writing any code. Build only the slice named in the block. Every acceptance criterion listed under "Must pass" has to pass before you open the PR; run the commands under "Verify" and paste their tail into the PR description. If the spec is wrong or silent about something you need, make the smallest reasonable decision, edit the spec in the same PR, and list the edit under "Spec changes" in the PR description. Do not touch anything listed under "Out of scope". Commit with Conventional Commits, no em dashes anywhere, no emoji. End by opening a PR with the title given in the block and a description with these headings: Summary, Acceptance criteria (each id and how it was checked), Spec changes, Verify output, Stopping note (only if unfinished).
```

## Session block template (Sunday planning writes these)

```
### Session <phase>.<n>: <title>

Spec: docs/specs/<file>.md, slice <n> (and any second spec and slice)
Branch: <type>/<short-name>
PR title: <type>(<scope>): <summary>

Goal: <one sentence, the user-visible or system-visible outcome>

Read first: <ordered list of files and sections; keep it under eight items>

Deliverables:
- <file or behavior>
- ...

Must pass: <AC ids from the spec, plus any explicit check not in the spec>

Verify:
- <command>
- <manual step on device, with theme and state>

Out of scope: <the nearby things this session must not do, with the session that will>

Notes: <gotchas, decisions already made, links to Figma frames>
```

## Phase 0: Foundations (October 2026)

Ten sessions. Two weeknights a week plus two Sunday slots covers it in four weeks with slack for the device QA.

### Session 0.1: Monorepo audit and workspace scaffold

Spec: none (repo skeleton). Related: docs/adr/0001-monorepo-tooling.md
Branch: chore/workspace-scaffold
PR title: chore: audit skeleton and wire pnpm workspaces and Turborepo

Goal: `pnpm install`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` run green across every workspace package before any app exists.

Read first: CLAUDE.md, README.md, docs/architecture.md section 2, packages/config/README.md, packages/design-tokens/README.md, packages/ui/README.md, packages/types/README.md, packages/api-client/README.md, .github/workflows/ci.yml

Deliverables:
- Audit of the existing skeleton in the PR description: what is kept, what is replaced, and why (the plan assumed a `research/` scaffold; the repo has `apps/*` and `packages/*` placeholders instead).
- `packages/config` with shared eslint (flat config), prettier, and tsconfig bases; each other package extends them.
- `packages/design-tokens`, `packages/ui`, `packages/types`, `packages/api-client` as real workspace packages with `package.json`, `tsconfig.json`, a `src/index.ts`, and passing `lint`, `typecheck`, `test` (Vitest, one placeholder test each), `build` scripts.
- Root `turbo.json` pipeline with `dependsOn` for `build`, `pnpm-lock.yaml` committed, `.nvmrc` and `.ruby-version` respected by `mise`.
- CI `js` job runs and passes on the PR (the `api` job still skips).

Must pass: `pnpm install --frozen-lockfile` then `pnpm turbo run lint typecheck test build --filter='!@curb/api'` exits 0 locally and in CI; `tooling/check-em-dashes.sh` passes.

Verify:
- `pnpm install --frozen-lockfile && pnpm turbo run lint typecheck test build --filter='!@curb/api'`
- `bash tooling/check-em-dashes.sh`

Out of scope: generating any app (0.2, 0.4, 0.8), token build logic (0.3), the OpenAPI pipeline (0.9).

Notes: Keep `packages/ui` logic-only per its README. Do not add Changesets. If Turborepo remote cache variables are unset, CI must still pass.

### Session 0.2: Rails API skeleton with PostGIS, RSpec, and CI

Spec: docs/specs/admin.md (Phase 0 namespace wiring is 0.7, not here). Related: apps/api/README.md, docs/adr/0002-rails-api-only.md, docs/adr/0003-postgis-geo.md
Branch: chore/api-skeleton
PR title: chore(api): generate Rails 8 API with PostGIS, RSpec, Solid Queue, and CI

Goal: `pnpm --filter @curb/api build && pnpm --filter @curb/api test` passes locally against Docker Postgres and in the CI `api` job, with `GET /v1/health` live.

Read first: CLAUDE.md, apps/api/README.md (names, generate command, gems, structure), docs/local-development.md, docs/architecture.md section 3.1, docs/data-model.md (extensions paragraph only), .github/workflows/ci.yml (`api` job)

Deliverables:
- `apps/api` generated with the exact command in its README (`--name=curb_social_club`, API-only, PostgreSQL, no test unit), `structure.sql` schema format, UUID primary keys configured as the default in the generator config.
- First migration enabling `postgis`, `pgcrypto`, `btree_gist`, `pg_trgm`, `citext`. No tables yet.
- Gems from the README's Core, API, Geo, Jobs and cache, Docs, Observability, and Dev and test groups; `activerecord-postgis-adapter` configured; Solid Queue and Solid Cache pointed at the primary database per docs/data-model.md.
- `Api::V1::ApplicationController` with the error envelope from docs/api.md, `GET /v1/health` returning `{ status, db, queue_lag_s }`, rswag installed with `swagger_helper.rb` and the health request spec generating `swagger/v1/openapi.yaml`.
- rubocop-rails-omakase plus rubocop-rspec configured; `bin/dev` with `Procfile.dev` (Puma and a Solid Queue worker); Dockerfile with libvips; `.env.example` with every variable from docs/local-development.md.
- `apps/api/package.json` scripts and `turbo.json` per docs/architecture.md section 2.

Must pass: `pnpm --filter @curb/api build`, `pnpm --filter @curb/api test`, `pnpm --filter @curb/api lint`, `pnpm --filter @curb/api openapi` exit 0 locally; the CI `api` job passes including the "OpenAPI spec is up to date" step; `curl localhost:3000/v1/health` returns 200 with `db: true`.

Verify:
- `docker compose up -d && pnpm --filter @curb/api build && pnpm --filter @curb/api test && pnpm --filter @curb/api lint && pnpm --filter @curb/api openapi && git status --porcelain swagger/`
- `bin/dev` then `curl -s localhost:3000/v1/health`

Out of scope: any domain table (1.1), auth (0.5), admin views (0.7), deploy (0.8).

Notes: Ruby 3.3 per `.ruby-version` unless `rails new` on 3.4 is painless (gaps item 25); record the choice in the PR. Do not add an LLM client gem yet.

### Session 0.3: Design tokens package and theme build

Spec: docs/specs/design-system-and-theming.md, slices covering the tokens package and outputs
Branch: feat/design-tokens
PR title: feat(tokens): build tokens.json into TS and CSS for three themes in light and dark

Goal: `pnpm --filter @curb/design-tokens build` emits `dist/tokens.ts`, `dist/tokens.css`, and `dist/tailwind.theme.js` for all six theme variants from `packages/design-tokens/tokens.json`, with contrast checks that fail the build.

Read first: docs/specs/design-system-and-theming.md (Requirements, Data, Verification), packages/design-tokens/README.md, brand/brand-guide.md (themes and type sections), docs/components/primary-cta.md (motion tokens)

Deliverables:
- Build script (TypeScript, run with `tsx`) that validates `tokens.json` against a schema, computes contrast for every text-on-surface pair the spec names, and writes `dist/tokens.ts` (exports `themes`, `getTheme`, `typography`, `spacing`, `radius`, `glass`, `motion`, and the types `ThemeName`, `Scheme`, `Role`, `ThemeColors`), `dist/tokens.css`, and `dist/tailwind.theme.js`, per R-2.
- `dist/**` gitignored; Turborepo `build` dependency so consumers build it; a Vitest suite for the validator and the contrast gate.
- The default theme constant (Marine Layer light) and the mirror check that `brand/tokens.json` equals the package copy.

Must pass: AC-1 to AC-4 in design-system-and-theming.md.

Verify:
- `pnpm --filter @curb/design-tokens build && pnpm --filter @curb/design-tokens test && git status --porcelain packages/design-tokens`

Out of scope: consuming the tokens on mobile (0.4) or web (0.8), Figma sync.

Notes: `brand/tokens.json` mirrors `packages/design-tokens/tokens.json`; the package copy is the source and the build should fail if they differ.

### Session 0.4: Expo app shell with four glass tabs, themes, and fonts

Spec: docs/specs/design-system-and-theming.md (mobile slices), docs/specs/auth-and-accounts.md (S07 skeleton only). Related: apps/mobile/README.md, docs/mobile-liquid-glass.md, docs/screens.md
Branch: feat/mobile-shell
PR title: feat(mobile): Expo app shell with native glass tabs, Unistyles themes, fonts, and theme picker

Goal: a development build on a physical iPhone shows Home, Map, Create, and Me as a native Liquid Glass tab bar, a Settings screen with a working theme picker across all six variants, and the flat-rendering QA recorded in `brand/previews/`.

Read first: docs/specs/design-system-and-theming.md (all), docs/screens.md (Navigation, S07, S27, S38, S40), apps/mobile/README.md, docs/mobile-liquid-glass.md sections 2.1, 2.2, 5, 6, packages/design-tokens/README.md

Deliverables:
- `apps/mobile` generated per its README (`name` and `slug` `curb`, scheme `curb`, bundle id placeholder `club.curbsocial.app`), Expo Router, native tabs with the four tabs, native stack headers, `expo-glass-effect` only where the spec allows.
- Unistyles 3 configured with the six variants from `@curb/design-tokens`, following system appearance with a manual override persisted in MMKV, and a `Text` and `Surface` primitive in `apps/mobile/src/ui`.
- Fonts (Instrument Serif, Geist, fallbacks) subset and loaded before first render; serif only on the surfaces the spec names.
- Settings (S27) with the theme picker (S38) and a placeholder for the other sections; Me (S07) signed-out skeleton; `dev/gallery` (S40) showing every primitive in every state, excluded from release builds.
- `eas.json` with development, preview, and production profiles; a development build installed on the builder's phone.
- Flat-rendering QA per the spec's device checklist for all six variants, screenshots committed under `brand/previews/phase-0/`.

Must pass: the spec's mobile and QA ACs; `pnpm --filter @curb/mobile typecheck && pnpm --filter @curb/mobile lint && pnpm --filter @curb/mobile test`.

Verify:
- `pnpm --filter @curb/mobile typecheck && pnpm --filter @curb/mobile lint && pnpm --filter @curb/mobile test`
- `eas build --profile development --platform ios` (or `pnpm --filter @curb/mobile ios`), install, switch every theme in Settings, run the checklist, screenshot each.

Out of scope: sign-in (0.6), any data (Phase 1), maps (1.12).

Notes: SDK 57 now, SDK 58 as soon as stable (gaps item 20). If a native tab bar API is missing on the installed SDK, keep a plain tab bar fallback behind a flag and say so in the PR. The pnpm and Metro symlink note in apps/mobile/README.md applies.

### Session 0.5: Auth API, sessions, devices, and account deletion

Spec: docs/specs/auth-and-accounts.md, API slices
Branch: feat/api-auth
PR title: feat(api): Apple and Google sign-in, opaque sessions, devices, and account deletion

Goal: `POST /v1/auth/apple`, `POST /v1/auth/google`, `DELETE /v1/auth/session`, `POST /v1/devices`, `PATCH /v1/devices/:anonymous_id`, `GET /v1/me`, `PATCH /v1/me` (account fields), and `DELETE /v1/me` work with request specs that generate the OpenAPI spec.

Read first: docs/specs/auth-and-accounts.md (all), docs/adr/0006-auth-strategy.md, docs/data-model.md (users, identities, sessions, devices, profiles), docs/api.md (Conventions, Auth, Me, Devices), docs/architecture.md section 3.8

Deliverables:
- Migrations and models for `users`, `identities`, `sessions`, `devices`, `profiles` with the columns in the data model (including `identities.provider_refresh_token` encrypted, `devices.timezone`, `users.terms_accepted_at`), the seeded app account with handle `curb`.
- `Auth::AppleTokenVerifier`, `Auth::GoogleTokenVerifier` (JWKS cached in Solid Cache, all claim checks), `Auth::SessionIssuer` (32-byte token, SHA256 digest, 90-day sliding expiry), the `Authenticate` concern that treats a bad token as anonymous on anonymous-allowed endpoints, `X-Device-Id` handling and device linking on sign-in.
- Account deletion: soft delete through `AccountDeletionJob`, immediate hiding rules, Apple revocation call, `AccountPurgeJob` at 30 days, `SessionSweepJob` nightly, restore on sign-in (names per the spec's ACs).
- Pundit installed with the role model; rack-attack limits for `/auth/*`.
- rswag request specs for every endpoint above, `swagger/v1/openapi.yaml` regenerated.

Must pass: the spec's API ACs; `pnpm --filter @curb/api test && pnpm --filter @curb/api openapi && git diff --exit-code apps/api/swagger`.

Verify:
- `pnpm --filter @curb/api test spec/requests/api/v1/auth_spec.rb spec/requests/api/v1/me_spec.rb spec/requests/api/v1/devices_spec.rb spec/services/auth && pnpm --filter @curb/api openapi && git diff --exit-code apps/api/swagger`

Out of scope: the mobile sign-in sheet (0.6), profile fields beyond handle and display name (Phase 2), admin sign-in (0.7).

Notes: Apple's `full_name` only arrives on first authorization; the request spec must cover the second sign-in losing nothing. Use WebMock for JWKS; never call Apple or Google in specs.

### Session 0.6: Sign-in sheet, secure token storage, and delete account on mobile

Spec: docs/specs/auth-and-accounts.md, mobile slices
Branch: feat/mobile-auth
PR title: feat(mobile): sign-in sheet, session storage, Me tab, and delete account

Goal: on a device, any gated action opens the sign-in sheet (S26), Sign in with Apple and Google complete against staging, the token lives in the Keychain, Me (S07) shows the signed-in state, and Delete account (S35) works end to end.

Read first: docs/specs/auth-and-accounts.md (Mobile requirements, Screens, Copy, ACs), docs/screens.md (S07, S26, S27, S35), apps/mobile/README.md (Integration points), packages/api-client/README.md

Deliverables:
- `@curb/api-client` `createClient` wired with token from `expo-secure-store` and `X-Device-Id` from a persisted UUID; `POST /devices` on launch with platform, app version, timezone.
- S26 as a modal sheet with both providers, the pending-action pattern (the gated action completes after sign-in), provider error and cancel states with the spec's copy.
- S07 signed-out and signed-in states; S27 account section (email, linked providers, sign out); S35 with confirmation and the in-progress state.
- Jest tests for the pending-action hook and the client token injection.

Must pass: the spec's mobile ACs; `pnpm --filter @curb/mobile test`.

Verify:
- `pnpm --filter @curb/mobile typecheck && pnpm --filter @curb/mobile test`
- On device against staging: sign in with Apple, kill the app, reopen signed in, sign out, sign in with Google, delete the account, confirm `GET /me` returns 401 afterwards.

Out of scope: profile editing (Phase 2), web sign-in (Phase 7).

Notes: Apple sign-in on the simulator needs a signed-in Apple ID; test on the physical device. Depends on 0.5 deployed to staging (0.8) or a LAN URL per docs/local-development.md.

### Session 0.7: Admin namespace, sign-in, and Mission Control

Spec: docs/specs/admin.md, slice 1 (Phase 0)
Branch: feat/admin-shell
PR title: feat(api): admin namespace with Google sign-in, layout, and Mission Control jobs

Goal: `/admin/sign_in` accepts a Google id token for a user with role `admin` or `moderator`, sets a cookie session, and `/admin` and `/admin/jobs` render; every other role gets a 302.

Read first: docs/specs/admin.md (Summary, Scope, R for Phase 0, A01, A02, A12, Verification), docs/screens.md (Admin screens), apps/api/README.md (structure), docs/data-model.md (admin_audits)

Deliverables:
- `Admin::BaseController` on `ActionController::Base` with cookies, session store, flash, CSRF, and Propshaft serving one stylesheet and one small script, scoped to `/admin` only; the API controllers stay API-only.
- A01 sign-in page with Google Identity Services, `POST /admin/session` verified by `Auth::GoogleTokenVerifier`, sign-out; A02 dashboard with counts and job health; A12 mounting `mission_control-jobs` behind the admin session.
- `admin_audits` table and the `AdminAudit.record` helper wired to the base controller for every non-GET write.
- rack-attack limits from docs/api.md for `/admin`; the route-sweep request spec asserting every `/admin` route 302s for anonymous and member users.

Must pass: the spec's Phase 0 ACs including the route sweep.

Verify:
- `pnpm --filter @curb/api test spec/requests/admin`
- `bin/dev`, visit `/admin/sign_in`, sign in with the builder's Google account after setting `role: admin` in the console, open `/admin/jobs`.

Out of scope: any CRUD screen (1.8, 1.9), moderation queue (Phase 2).

Notes: Do not add an admin gem (the spec's decision). Keep the stylesheet under 200 lines and flat.

### Session 0.8: Deploy pipeline: staging API on Render, web placeholder on Vercel, Sentry

Spec: none (infrastructure). Related: docs/adr/0008-hosting.md, docs/architecture.md sections 3.11 and 7, apps/web/README.md
Branch: chore/deploy-pipeline
PR title: chore: staging deploys for API and web, EAS dev profile, Sentry on all tiers

Goal: merging to `main` deploys the API to Render staging with Postgres and PostGIS and runs migrations; every PR gets a Vercel preview of the web app; Sentry receives a test event from API, web, and mobile.

Read first: docs/adr/0008-hosting.md, docs/architecture.md sections 3.10, 3.11, 7, apps/web/README.md (generate command, structure), docs/local-development.md (environment variables), .github/workflows/ci.yml

Deliverables:
- `apps/web` generated with the exact command in its README (React Router v7, Vercel template), wired to `@curb/config` and `@curb/design-tokens` (`tokens.css` in `root.tsx`), a placeholder home route, `VITE_API_URL` read in loaders, and Playwright installed with one smoke test.
- Render blueprint (`render.yaml`) for the API web service, a Solid Queue worker, and a Postgres instance with PostGIS; `bin/render-build.sh`; health check on `/v1/health`; environment variables documented in `.env.example`.
- Vercel project settings committed where possible (`vercel.json`), preview per PR.
- Sentry initialized on API (`sentry-rails`), web, and mobile (`@sentry/react-native`), with a `SENTRY_DSN` per tier and a documented way to send a test event.
- `docs/local-development.md` updated with the staging URLs and how to point the dev build at staging.

Must pass: a merge to `main` shows the API healthy on Render; a PR shows a Vercel preview URL; three test events appear in Sentry.

Verify:
- `curl -s https://<staging-api>/v1/health`
- Open the Vercel preview from the PR checks.
- Trigger the test event on each tier and screenshot Sentry.

Out of scope: production environments, custom domains (gaps item 2), EAS production builds.

Notes: ADR 0008 is Proposed; this session makes it Accepted for Render if the blueprint works in one evening, and records the outcome in the ADR. Secrets go into Render and Vercel dashboards, never the repo.

### Session 0.9: OpenAPI to types to api-client pipeline

Spec: none (shared packages). Related: docs/architecture.md sections 6.1 and 6.4, packages/types/README.md, packages/api-client/README.md
Branch: feat/api-client-pipeline
PR title: feat(types,api-client): generate TypeScript types from OpenAPI and ship the typed client

Goal: `pnpm --filter @curb/types generate` turns `apps/api/swagger/v1/openapi.yaml` into `packages/types/src/generated.d.ts`, `@curb/api-client` exposes `createClient` and typed hooks for the auth, me, and devices endpoints, and a contract test fails when the client and spec disagree.

Read first: docs/architecture.md sections 6.1 and 6.4, packages/types/README.md, packages/api-client/README.md, docs/api.md (Conventions, Error envelope, Response envelope)

Deliverables:
- `openapi-typescript` generation script and the committed output; CI check that it is up to date (already in `ci.yml`, make it pass).
- `@curb/api-client` built on `openapi-fetch` with token and device-id injection, the error envelope typed, cursor pagination helpers, and TanStack Query hooks with shared query keys for `me`, `devices`, and `auth`.
- Vitest contract test that every path in the client's hook map exists in the generated types.
- Mobile switched to the shared client (replacing anything local from 0.6).

Must pass: `pnpm --filter @curb/types generate && git diff --exit-code packages/types/src && pnpm --filter @curb/api-client test`.

Verify:
- `pnpm --filter @curb/api openapi && pnpm --filter @curb/types generate && git diff --exit-code packages/types/src apps/api/swagger && pnpm --filter @curb/api-client test && pnpm --filter @curb/mobile typecheck`

Out of scope: hooks for endpoints that do not exist yet; web loaders (1.16).

Notes: Query keys live in the shared package so web and mobile share cache conventions (docs/mobile-liquid-glass.md, Data layer).

### Session 0.10: Primary CTA hook and button

Spec: docs/specs/design-system-and-theming.md, slice 4 (slice 5, the web `PrimaryButton`, is deferred to the first web write surface in Phase 7; web needs no async CTA while it is read-only)
Branch: feat/primary-cta
PR title: feat(mobile,ui): useAsyncAction hook and PrimaryButton with loading and confirmed states

Goal: the primary CTA the Phase 2 RSVP will use exists on mobile with every state from docs/components/primary-cta.md, driven by a shared hook whose timings come from the tokens package, and the dev gallery shows all of them.

Read first: docs/specs/design-system-and-theming.md (R-16 to R-19, AC-8 to AC-12, AC-14, AC-15), docs/components/primary-cta.md, packages/ui/README.md, packages/design-tokens/README.md (motion tokens), docs/screens.md (S40)

Deliverables:
- `useAsyncAction(fn, { delay, minLoading, hold, timeout })` in `packages/ui` with the timings imported from `@curb/design-tokens` `motion`, returning `{ status, run, error }`, with Vitest timing tests using fake timers.
- `PrimaryButton` in `apps/mobile/src/ui` with Reanimated 4, the SVG ring and check, haptics, reduced-motion fallback, controlled `status` and uncontrolled `onPress` modes, theme-tracking fill color; RNTL snapshot tests per status.
- `dev/gallery` (S40) extended to show every `PrimaryButton` status in every theme variant.

Must pass: AC-8 to AC-12, AC-14, AC-15 in design-system-and-theming.md.

Verify:
- `pnpm --filter @curb/ui test && pnpm --filter @curb/mobile test && pnpm --filter @curb/mobile typecheck`
- On device in Marine Layer light and Harbor dark: open `dev/gallery`, trigger the uncontrolled button, watch idle to loading to confirmed with the 150 ms delay and 400 ms minimum; enable Reduce Motion and confirm the crossfade fallback.

Out of scope: wiring the button to RSVP (Phase 2, event-detail-and-rsvp.md slice 5), the web renderer (Phase 7).

Notes: `packages/ui` holds the hook only; rendering code stays in the app. Timings live in one place (the tokens package) so Figma's motion spec and the code agree.

## Phase 1: Read-only discovery (November to mid December 2026)

Seventeen sessions over seven weeks: two weeknights a week is fourteen, so three land on Sundays. Saturday mornings in this phase are seeding and verification, which is product time, not a Claude session. Seeding the remaining thirty meets after session 1.10 happens in the CSV by hand and through the admin UI.

### Session 1.1: Host migration and models

Spec: docs/specs/events-and-occurrences.md, slice 1; docs/specs/clubs.md, slice 1; docs/specs/sponsors.md, slice 1 (the `HostConsistencyJob` rows in all three move to 1.5)
Branch: feat/api-host-models
PR title: feat(api): venues, events, occurrences, clubs, sponsors, and claim requests in one migration set

Goal: one migration set creates `venues`, `events`, `event_occurrences`, `clubs`, `club_memberships`, `sponsors`, `event_sponsorships`, and `claim_requests` with every column and index in docs/data-model.md, and the models enforce the host, rrule, single-owner, and six-sponsorship rules with a factory for every table.

Read first: docs/specs/events-and-occurrences.md (Data requirements R-1 to R-9, Data, AC-11, AC-12, AC-15), docs/specs/clubs.md (Data requirements R-1 to R-5, AC-5, AC-6), docs/specs/sponsors.md (Data requirements R-1 to R-5, AC-6 to AC-8), docs/data-model.md (Host types, Places and events, Clubs and sponsors, claim_requests), docs/adr/0010-host-types-clubs-sponsors.md, docs/architecture.md section 3.3

Deliverables:
- Migrations for the eight tables with `structure.sql` regenerated: `events.cadence` and `events.dormant_at`, the partial and GiST indexes from the specs, `btree_gist` on `event_occurrences (location, starts_at)`, trigram GINs on `events.title`, `events.host_name`, `clubs.name`, `sponsors.name`, and no database FK on `events.host_id`.
- Models `Venue`, `Event`, `EventOccurrence`, `Club`, `ClubMembership`, `Sponsor`, `EventSponsorship`, `ClaimRequest`: polymorphic `host` on `Event` with an existence check per type; `Recurrence::RruleValidator` enforcing the R-4 grammar; cadence rules from R-3 (`dtstart` nullable only for `announced`); a slug generator (`<kebab-title>-<6 lowercase alphanumerics>`, explicit slug allowed for seeds); `host_name` written on save and rewritten by `after_update` on `profiles`, `clubs`, and `sponsors`.
- Rules: exactly one `owner` per club (reject a second, reject removing the last); at most six sponsorships per event, unique on `(event_id, sponsor_id)`; a venue `location` change copies to future `scheduled` occurrences in the same transaction (R-8); counter caches `events.occurrences_count` (scheduled only), `clubs.members_count` (active only), `clubs.events_count`, `sponsors.events_count` (hosted plus attached, published only).
- `config/features.yml` with `clubs_self_service: false` and `sponsors_self_service: false`, read at boot.
- FactoryBot factories for every table, with `:coastal` and `:inland` venue traits using the fixture coordinates in the events spec, and model specs for every rule above.

Must pass: events-and-occurrences.md AC-11, AC-12 (model part), AC-15; clubs.md AC-2 (model part), AC-5, AC-6 (model part); sponsors.md AC-3 (model part), AC-6, AC-7 (model part), AC-8; `bin/rails db:migrate && bin/rails db:rollback && bin/rails db:migrate` runs clean.

Verify:
- `docker compose up -d && pnpm --filter @curb/api build && pnpm --filter @curb/api test spec/models spec/services/recurrence/rrule_validator_spec.rb && pnpm --filter @curb/api lint`
- `cd apps/api && bin/rails db:migrate:status && git status --porcelain db/structure.sql`

Out of scope: the materializer and describer (1.2), any endpoint or serializer (1.3, 1.4, 1.6), `HostConsistencyJob` and `Venues::Deduper` (1.5), admin screens (1.8, 1.9), the seed importer (1.10), `rsvps`, `follows`, `blocks`, `vehicles` (Phase 2).

Notes: `events.host_id` has no FK by design (docs/data-model.md); validate existence in the model and let 1.5 report drift. `claim_requests` ships now so the schema is complete for Phase 2, with validations only. Keep `ice_cube` out of this session; the validator is a small grammar check. The app account with handle `curb` from 0.5 is the default `created_by` and user host for seeds. Run `annotaterb` after migrating.

### Session 1.2: Materializer and describer

Spec: docs/specs/events-and-occurrences.md, slice 2
Branch: feat/api-materializer
PR title: feat(api): occurrence materializer, nightly job, and rrule describer

Goal: `MaterializeOccurrencesJob` expands every published recurring event 90 days ahead idempotently, keeps overrides, cancels rows the rule no longer produces, completes past occurrences, and `Recurrence::Describer` returns the exact `rrule_text` strings from the spec.

Read first: docs/specs/events-and-occurrences.md (Recurrence and materialization R-10 to R-13, R-15, R-9, Copy `rrule_text` rows, AC-7 to AC-10), docs/architecture.md section 3.5, docs/adr/0003-postgis-geo.md, docs/data-model.md (event_occurrences), apps/api/README.md (Planned structure: services/recurrence, config/recurring.yml)

Deliverables:
- `Recurrence::Materializer.call(event)` using `ice_cube` in the event's `timezone` from `dtstart` to `now + 90 days` or `rrule_until`, upserting on `(event_id, starts_at)`, copying `location` from the venue, skipping `overridden_at` rows, cancelling (never deleting) future `scheduled` rows the rule no longer produces, one row for `once`, nothing for `announced`, `draft`, or dormant events.
- `MaterializeOccurrencesJob` (all events, or one `event_id`), enqueued after create or schedule change of a `published` event through a model callback guarded by a `schedule_changed?` check, plus a completion step in the nightly run that moves `scheduled` rows past `ends_at` to `completed` and keeps `occurrences_count` right.
- `config/recurring.yml` with the 02:00 America/Los_Angeles nightly run (1.5 adds the 02:30 and 02:45 entries).
- `Recurrence::Describer.call(event)` returning "Every Saturday", "Every other Sunday", "First Sunday of the month", "Last Saturday of the month", "Every Saturday through Oct 31", "Dates announced by the host", or null for `once`.
- Job and service specs with `travel_to` fixtures around 2026-11-01 (DST end) and 2026-10-01 (monthly and seasonal), including a rerun assertion that the second run changes no row.

Must pass: events-and-occurrences.md AC-7, AC-8, AC-9, AC-10 (job and model parts; the `GET /events?host=` assertion completes in 1.3).

Verify:
- `pnpm --filter @curb/api test spec/services/recurrence spec/jobs/materialize_occurrences_job_spec.rb spec/models/event_occurrence_spec.rb && pnpm --filter @curb/api lint`
- `bin/rails runner 'MaterializeOccurrencesJob.perform_now'` twice against a console-created weekly event and confirm `EventOccurrence.count` is unchanged the second time.

Out of scope: the read-time trigger on `GET /events/:slug` (1.4), `POST /events/:id/occurrences` and `PATCH /occurrences/:id` (Phase 2, create-and-host-tools.md), decay (1.5), the admin Re-materialize button (1.8).

Notes: Build the `ice_cube` schedule from `ActiveSupport::TimeZone[event.timezone]` so local start times survive DST (AC-7 expects 14:30Z before and 15:30Z after 2026-11-01). Monthly ordinals such as `BYDAY=1SU` and `-1SA` map to `day_of_week(sunday: [1])` and `day_of_week(saturday: [-1])`; write the translator once and test every ordinal R-4 allows. The Describer is server-side only; clients render `rrule_text` as received and `packages/ui` does not get a describer in this phase.

### Session 1.3: Geo queries and list and map endpoints

Spec: docs/specs/events-and-occurrences.md, slice 3; docs/specs/discovery.md, slice 1 (the `GET /events` and `GET /events/map` deltas in R-7 to R-9; the feed cache in R-24 is 1.7)
Branch: feat/api-events-list-map
PR title: feat(api): PostGIS nearby and viewport queries behind GET /events and GET /events/map

Goal: `GET /events` (near, bbox, host, sponsor, q, tags, recurring, sort, cursor) and `GET /events/map` return EventSummary and MapPin rows from indexed PostGIS queries with integer `distance_m`, `stale`, the exact ordering and 400 cases in the spec, and the OpenAPI spec and generated types include both.

Read first: docs/specs/events-and-occurrences.md (Geo and API R-16 to R-21, R-23, R-25, API, Copy 400 rows, AC-1 to AC-6, AC-16, AC-22, Verification), docs/specs/discovery.md (R-7 to R-9, AC-5 to AC-7), docs/api.md (Conventions, Host, EventSummary, MapPin, Events), docs/architecture.md section 3.4, docs/adr/0003-postgis-geo.md, docs/specs/sponsors.md (R-9 for `sponsors_preview`)

Deliverables:
- `Geo::NearbyQuery` (`ST_DWithin` plus `ST_Distance`, default 32 km, clamp at 160, window default now to +14 days, maximum 90) and `Geo::ViewportQuery` (`ST_Intersects` on `ST_MakeEnvelope`), each returning one row per event with its earliest occurrence in the window, joined to `published`, `public`, non-dormant events; a direct `events` path for `host=`, `sponsor=`, and `q` without geo that includes `announced` events with null `next_occurrence`, ordered nulls last.
- Filters and sorts per R-19 and R-20: `tags[]` overlap, `recurring`, trigram `q` on `title` and `host_name` plus `ILIKE` on `venues.name`, `sort=date` (local day, then stale, then `starts_at`, then distance) and `sort=distance`; opaque cursor pagination with `meta.next_cursor`; `Event.stale_sql` (R-25) defined once and exposed on EventSummary.
- 400 `bad_request` with the spec's messages for `near` with `bbox`, a window over 90 days, and `sort=distance` without `near`; `radius_km` above 160 clamps (AC-2).
- `GET /events/map` requiring `bbox` (400 when missing or wider than 5 degrees), accepting `from`, `to`, `tags[]`, `recurring`, one MapPin per event, cap 500 by `starts_at`, `meta.truncated`.
- Alba resources `HostResource`, `EventSummaryResource` (with `cadence`, `stale`, `last_confirmed_at`, `claimed`, `source`, `sponsors_preview` of at most two by `position`), `MapPinResource`; `Api::V1::EventsController#index` and `#map`; rswag request specs on the coastal and Inland Empire fixture coordinates, never mocks; an `EXPLAIN` spec asserting the GiST index on `event_occurrences` with 5,000 rows; `swagger/v1/openapi.yaml` and `packages/types` regenerated.

Must pass: events-and-occurrences.md AC-1 to AC-6, AC-16 (ordering), AC-22 (list part), the `GET /events?host=club:<id>` assertion of AC-10; discovery.md AC-5, AC-6, AC-7 (the `GET /events` requests; the clubs and sponsors requests are 1.6).

Verify:
- `pnpm --filter @curb/api test spec/requests/api/v1/events_spec.rb spec/requests/api/v1/events_map_spec.rb spec/services/geo && pnpm --filter @curb/api lint`
- `pnpm --filter @curb/api openapi && pnpm --filter @curb/types generate && git diff --exit-code packages/types/src apps/api/swagger`

Out of scope: `GET /events/:slug` and the occurrence endpoints (1.4), `SeedDecayJob` and `Venues::Deduper` (1.5), the hidden-sponsor filter on `sponsors_preview` (1.6), `GET /feed` and its cache (1.7), any client hook (1.11, 1.12).

Notes: Distance math lives in SQL only (R-23); a Ruby haversine is a review reject. Encode the cursor as base64 of `(local day, stale, starts_at, distance_m, id)` and keep it opaque. The AC-4 bbox is `-118.05,33.40,-117.60,33.70`. Dormant exclusion (R-27) is a scope here even though nothing writes `dormant_at` until 1.5. `radius_km` over 160 clamps on `GET /events` (AC-2) but is a 400 on `GET /feed` (discovery.md AC-4); do not unify them.

### Session 1.4: Event detail, occurrences, confirm endpoints and policies

Spec: docs/specs/events-and-occurrences.md, slice 4; docs/specs/event-detail-and-rsvp.md, slice 1
Branch: feat/api-event-detail
PR title: feat(api): event detail, occurrence reads, confirm endpoint, and EventPolicy

Goal: `GET /events/:slug` (with `token` and `near`, 404 for drafts, 410 `gone` with `nearby`, 200 with `dormant: true`), `GET /events/:id/occurrences`, `GET /occurrences/:id`, and `POST /events/:id/confirm` work anonymously where the spec allows, enforce `EventPolicy`, and self-heal a short materialized horizon on read.

Read first: docs/specs/events-and-occurrences.md (R-14, R-22, R-24, R-27, AC-18, AC-19, AC-22, AC-23), docs/specs/event-detail-and-rsvp.md (API R-4 to R-6, AC-1 to AC-3, Risks), docs/api.md (Event, Occurrence, Events, Occurrences, Error envelope), docs/data-model.md (events `visibility`, `hidden_at`, `status`), docs/specs/auth-and-accounts.md (roles, the `Authenticate` concern)

Deliverables:
- `EventResource` (EventSummary plus `description`, `parking_note`, `rrule`, `dtstart`, `duration_minutes`, `rsvp_mode`, `capacity`, `status`, `visibility`, `dormant`, `hidden`, full `venue`, `external_host_name`, `upcoming_occurrences` as the next 4 `scheduled` or `cancelled`, `sponsorships` by `position`, `viewer` all false or null for anonymous, `photos_count`, `comments_count`, `followers_count`) and `OccurrenceResource` (with `timezone`, `override_note`, counts, empty `going_preview`, `viewer`).
- `EventsController#show` by slug: 404 for `draft` unless `viewer.can_edit`; 404 for `unlisted` without a valid `token` (`Events::UnlistedToken.generate` and `verify` on the event id); 410 `gone` with `nearby` (up to three EventSummary rows from `Geo::NearbyQuery` when `near` is passed) for `cancelled` or `hidden_at` events; 200 with `dormant: true` for dormant events; enqueue `MaterializeOccurrencesJob` for the event when recurring and the latest `scheduled` row is under 60 days out (R-14).
- `GET /events/:id/occurrences` (upcoming `scheduled` and `cancelled`, cursor paginated) and `GET /occurrences/:id`.
- `POST /events/:id/confirm` behind `EventPolicy#confirm?` (user host, `owner` or `admin` membership of the hosting club, or platform `admin`), setting `last_confirmed_at`, clearing `dormant_at`, enqueuing the materializer when it was dormant, returning the Event; 401 for anonymous, 403 otherwise.
- rswag request specs for every endpoint, an `EventPolicy` spec, OpenAPI and `packages/types` regenerated.

Must pass: events-and-occurrences.md AC-18, AC-19, AC-22 (detail part), AC-23; event-detail-and-rsvp.md AC-1, AC-2 (the `GET /feed` half moves to 1.7), AC-3.

Verify:
- `pnpm --filter @curb/api test spec/requests/api/v1/events_show_spec.rb spec/requests/api/v1/occurrences_spec.rb spec/requests/api/v1/event_confirm_spec.rb spec/policies/event_policy_spec.rb && pnpm --filter @curb/api lint`
- `pnpm --filter @curb/api openapi && pnpm --filter @curb/types generate && git diff --exit-code packages/types/src apps/api/swagger`

Out of scope: RSVP, attendees, and `viewer.rsvp` (Phase 2, event-detail-and-rsvp.md slice 4), `PATCH /occurrences/:id` and `POST /events/:id/occurrences` (Phase 2, create-and-host-tools.md), the decay clocks themselves (1.5), the mobile screen (1.14) and web page (1.16).

Notes: A dormant event is 200 with `dormant: true` (events-and-occurrences.md R-27, docs/api.md agree); only hidden or deleted events are 410. `hidden_at` exists in the data model but nothing writes it until Phase 2 moderation, so the 410 branch needs a spec that sets the column directly. Use `ActiveSupport::MessageVerifier` keyed from `secret_key_base` for the unlisted token, with no expiry (the link is the secret).

### Session 1.5: Decay, host consistency, venue dedupe

Spec: docs/specs/events-and-occurrences.md, slice 5 (with the `HostConsistencyJob` rows from clubs.md slice 1 and sponsors.md slice 1)
Branch: feat/api-decay-consistency
PR title: feat(api): seed decay job, host consistency job, and venue dedupe

Goal: unclaimed events go stale at 30 days and dormant at 90 on a nightly clock, dormant events leave every list but keep their page, `HostConsistencyJob` reports missing or hidden hosts and repairs `host_name`, and `Venues::Deduper.find_or_create` reuses a venue by normalized name within 100 m.

Read first: docs/specs/events-and-occurrences.md (Confirmation and seed decay R-25 to R-28, R-31, R-6, Copy, AC-13, AC-14, AC-16, AC-17, Risks on gaps items 4 and 5), docs/specs/clubs.md (R-5, R-24), docs/specs/sponsors.md (R-5, R-21, AC-19), docs/specs/admin.md (R-13, for what A02 reads), docs/gaps-and-open-questions.md (items 5 and 6)

Deliverables:
- `SeedDecayJob` (02:45 America/Los_Angeles in `config/recurring.yml`) setting `dormant_at` per R-26 and logging the count and slugs; the `Event.not_dormant` scope applied in `GET /events` and `GET /events/map` and ready for `GET /feed`, search, host pages, and `GET /sitemap`.
- `HostConsistencyJob` (02:30) reporting every published event whose host row is missing or whose club or sponsor is `hidden`, rewriting `host_name` drift, storing the latest report and last-run time where A02 (1.9) can read them (Solid Cache under a fixed key is enough; say which in the PR), and adding a Sentry breadcrumb.
- `Venues::Deduper.find_or_create(attrs)` matching on lowercased, whitespace-collapsed name equality and `ST_DWithin(location, point, 100)`.
- `stale` verified end to end on EventSummary (defined in 1.3) with the AC-16 fixtures, including a claimed event confirmed 200 days ago.
- Job and service specs; `docs/local-development.md` gains a line on running each nightly job by hand.

Must pass: events-and-occurrences.md AC-13, AC-14, AC-16, AC-17, AC-12 (the `HostConsistencyJob` reports zero after a rename); sponsors.md AC-19.

Verify:
- `pnpm --filter @curb/api test spec/jobs/seed_decay_job_spec.rb spec/jobs/host_consistency_job_spec.rb spec/services/venues/deduper_spec.rb spec/requests/api/v1/events_spec.rb && pnpm --filter @curb/api lint`
- `bin/rails runner 'SeedDecayJob.perform_now; HostConsistencyJob.perform_now'` and read the two log lines.

Out of scope: the admin Verify now button and dashboard rendering (1.8, 1.9), the "Still happening?" host prompt (Phase 2, event-detail-and-rsvp.md slice 6), activity-based decay (Phase 4, gaps item 5), the importer's use of the deduper (1.10).

Notes: Hidden clubs and sponsors keep their events visible with the host attached (clubs.md R-5, sponsors.md R-5), so the job reports and never hides. `SeedDecayJob` touches only `claimed_at IS NULL` rows; a claimed event never decays. Keep both jobs idempotent so a second run the same night is a no-op with the same log.

### Session 1.6: Club and sponsor read endpoints, stubbed writes, search groups

Spec: docs/specs/clubs.md, slice 2; docs/specs/sponsors.md, slice 2; docs/specs/profiles-and-follow.md, slice 1 (API part: validations, `GET /users/:handle`, `GET /users/:handle/events`, `GET /users/:handle/clubs`; W06 is 1.17)
Branch: feat/api-host-pages
PR title: feat(api): club, sponsor, and user host read endpoints with stubbed self-service writes

Goal: every host type has its read endpoints (`GET /clubs`, `/clubs/:slug`, `/clubs/:slug/events`, `/clubs/:slug/members`, `GET /sponsors`, `/sponsors/:slug`, `/sponsors/:slug/events`, `GET /users/:handle`, `/users/:handle/events`, `/users/:handle/clubs`) working without a token, hidden rows 404 and vanish from lists and previews, trigram `q` behaves the same on all three, and every Phase 7 write endpoint returns 403 `not_enabled`.

Read first: docs/specs/clubs.md (API R-6 to R-10, R-13, R-18, AC-1 to AC-4, AC-7, AC-8), docs/specs/sponsors.md (API R-6 to R-13, R-17, AC-1 to AC-5, AC-9, AC-10), docs/specs/profiles-and-follow.md (R-1 to R-3, R-7, R-8, AC-1, AC-2), docs/api.md (ClubSummary and Club, SponsorSummary and Sponsor, Profile, Clubs, Sponsors, Users and follows), docs/specs/discovery.md (R-9)

Deliverables:
- Alba resources `ClubSummaryResource`, `ClubResource` (`upcoming_events` next 3, `members_preview` first 8 active, `viewer` false or null), `SponsorSummaryResource`, `SponsorResource` (`upcoming_events` with `relation`, deduplicated with `host` winning), `ProfileResource` (`links`, `clubs` with `role`, `counts`, `viewer` false), `MiniProfileResource`.
- Controllers and rswag specs for the ten read endpoints: `near` ordering with `distance_m` and the `followers_count` fallback; `kind` and `q` on sponsors; `q` on clubs (R-18) and sponsors (R-17) by trigram, within 80 km when `near` is present; members `active` only, cursor paginated, behind a `Blocks.excluded_ids(viewer)` seam that returns none until Phase 2; suspended or deleted users 404.
- Hidden handling: hidden clubs and sponsors 404 on show and vanish from lists; hidden sponsors leave `sponsorships` and `sponsors_preview` (finishing the 1.3 and 1.4 serializers).
- Profile validations from R-1 to R-3 (handle regex, the reserved list in `config/reserved_handles.yml`, `links` key and format rules, sizes, two-decimal `home_location`).
- Stubbed writes returning 403 `not_enabled` with the spec's message, gated on `config/features.yml`: `POST /clubs`, `PATCH /clubs/:id`, `PUT` and `DELETE /clubs/:id/membership`, `POST /clubs/:id/invites`, `POST /clubs/:id/invite_code`, `PATCH` and `DELETE /clubs/:id/members/:user_id`, `PATCH /sponsors/:id`; `EventPolicy#host_allowed?(host)` and `#sponsorships_allowed?` with policy specs for the Phase 2 `POST /events`; OpenAPI and `packages/types` regenerated.

Must pass: clubs.md AC-1, AC-2, AC-3, AC-7 (AC-4 needs `blocks` and moves to profiles-and-follow.md slice 4; AC-8 is a policy spec here and a request spec in the Phase 2 create session); sponsors.md AC-1 to AC-5, AC-10 (AC-9 is a policy spec here for the same reason); profiles-and-follow.md AC-1 (with `counts.vehicles` and `counts.followers` 0 until Phase 2 adds those tables), AC-2; discovery.md AC-7 (the clubs and sponsors requests).

Verify:
- `pnpm --filter @curb/api test spec/requests/api/v1/clubs_spec.rb spec/requests/api/v1/sponsors_spec.rb spec/requests/api/v1/users_spec.rb spec/requests/api/v1/events_spec.rb spec/models/profile_spec.rb spec/policies && pnpm --filter @curb/api lint`
- `pnpm --filter @curb/api openapi && pnpm --filter @curb/types generate && git diff --exit-code packages/types/src apps/api/swagger`

Out of scope: the `clubs_nearby` and `sponsors_nearby` feed sections (1.7, which carries clubs.md AC-9 and sponsors.md AC-11, AC-12), `follows`, `blocks`, `vehicles`, `PATCH /me` profile fields (Phase 2, profiles-and-follow.md slices 2 to 4), admin CRUD (1.9), the mobile pages (1.15) and web pages (1.17).

Notes: List the three deferrals in Must pass under Spec changes. `viewer.following` is always false in this phase; return the key anyway so the client shape is stable. Seeded clubs are owned by the app account (clubs.md Risks); `members_preview` still lists it and 1.15 hides the Owner label for the `curb` handle.

### Session 1.7: Feed endpoint with sections and the search endpoint

Spec: docs/specs/discovery.md, slice 2, plus the R-9 search specs and the R-24 cache left from slice 1; the feed section rows from clubs.md slice 2 (R-17) and sponsors.md slice 2 (R-12, R-13)
Branch: feat/api-feed-search
PR title: feat(api): sectioned feed, cross-resource search specs, venue search, and sitemap feed

Goal: `GET /feed?near=` returns `this_weekend`, `clubs_nearby`, `sponsors_nearby`, `next_week`, and `later` in order with empty sections omitted and `following` omitted for anonymous callers, served through Solid Cache for 60 seconds; `q` behaves identically across events, clubs, and sponsors; `GET /venues/search` returns existing venues then provider suggestions; and `GET /sitemap` feeds the web sitemap.

Read first: docs/specs/discovery.md (API R-5, R-6, R-9, R-24, R-3, AC-1, AC-2, AC-4, AC-7, Verification), docs/api.md (Feed, Venues, System `GET /sitemap`, Events `q` note), docs/specs/clubs.md (R-17, AC-9), docs/specs/sponsors.md (R-12, R-13, AC-11, AC-12), docs/specs/web.md (R-4), docs/specs/events-and-occurrences.md (R-27)

Deliverables:
- `Feed::Builder` composing `FeedSection` rows `{ kind, title, items, more }` over `Geo::NearbyQuery`: `this_weekend` (now through the coming Sunday 23:59 in the venue timezone), `next_week` (the following Monday through Sunday), `later` (the rest of the 90-day horizon), each event once by its next occurrence ordered by `starts_at` then `distance_m`; `clubs_nearby` (up to six active clubs with `home_location` in radius); `sponsors_nearby` (up to four active sponsors with a hosted or attached `scheduled` occurrence in radius, ordered by soonest occurrence then distance, no `paid` key); `following`, `recent_photos`, and `spots_nearby` not built.
- `Api::V1::FeedController#index` with `near` (or the device `home_location` from `X-Device-Id`), `radius_km` default 32 and 400 above 160, `meta.generated_at`, wrapped in `Rails.cache.fetch` keyed by rounded `near`, `radius_km`, and viewer presence for 60 seconds.
- `spec/requests/api/v1/search_spec.rb` covering R-9 across `GET /events?q=`, `GET /clubs?q=`, `GET /sponsors?q=` with and without `near`.
- `GET /venues/search` (`q`, `near`) returning existing venues first (trigram on `name`, nearest first) then provider suggestions through the `geocoder` gem with the key from docs/local-development.md, cached 24 h per query in Solid Cache, provider stubbed with WebMock in specs.
- `GET /sitemap` returning `{ events, clubs, sponsors, spots: [] }` with `slug` and `updated_at` for published public events with an upcoming occurrence, active clubs, and active sponsors, excluding dormant and unlisted rows, cached 1 h.
- rswag specs for `/feed`, `/venues/search`, `/sitemap`; OpenAPI and `packages/types` regenerated.

Must pass: discovery.md AC-1, AC-2 (the anonymous and sponsor halves; the `following` section is Phase 2), AC-4, AC-7; clubs.md AC-9; sponsors.md AC-11, AC-12; event-detail-and-rsvp.md AC-2 (the `GET /feed` absence check); an explicit check that `GET /venues/search` lists existing venues before provider rows and hits the cache on the second call.

Verify:
- `pnpm --filter @curb/api test spec/requests/api/v1/feed_spec.rb spec/requests/api/v1/search_spec.rb spec/requests/api/v1/venues_spec.rb spec/requests/api/v1/sitemap_spec.rb spec/services/feed && pnpm --filter @curb/api lint`
- `pnpm --filter @curb/api openapi && pnpm --filter @curb/types generate && git diff --exit-code packages/types/src apps/api/swagger`

Out of scope: `following`, `recent_photos`, `spots_nearby` (Phase 2 and 4, discovery.md slice 8), cross-section ranking (never at launch), the mobile feed (1.11) and search screen (1.13), web home and sitemap (1.16, 1.17).

Notes: Section windows are computed in the venue timezone (docs/api.md Feed), which at launch is always `America/Los_Angeles`; write the boundary math per venue anyway and test a Sunday 23:30 occurrence. Place search on S05 uses MapKit on device (discovery.md R-20), so `GET /venues/search` serves the Phase 2 venue picker and any client that cannot geocode locally; do not wire it into S05. `GET /sitemap` has no other API owner, so it ships here for 1.17. A spec asserts `sponsors_nearby` items carry no `paid` key (sponsors.md R-13).

### Session 1.8: Admin CRUD for venues, events, occurrences, and sponsorships

Spec: docs/specs/admin.md, slices 2 (partials, Pagy, A03; A08 moves to 1.9), 3 (A04), and 4 (A04 occurrences; A02 moves to 1.9); sponsors.md slice 3 (the A04 sponsorship rows)
Branch: feat/admin-venues-events
PR title: feat(api): admin CRUD for venues, events, occurrences, and sponsorships

Goal: an admin can create and edit venues and events in plain forms with host, venue, and sponsor pickers, run Verify now, Confirm now, and Re-materialize, and edit, cancel, add, and reset occurrences, with every write audited and every route still bouncing non-admins.

Read first: docs/specs/admin.md (R-1, R-2, R-14 to R-17, R-26, R-27, Copy, AC-5, AC-7 to AC-10, AC-22, Verification), docs/specs/events-and-occurrences.md (R-2, R-13, R-28, for what admin edits must trigger), docs/specs/sponsors.md (R-20), docs/screens.md (Admin screens), docs/data-model.md (admin_audits)

Deliverables:
- Shared partials `admin/shared/_table.html.erb`, `_form_errors`, `_field`; Pagy at 50 per page; `data-confirm` delegation in `admin.js`; times in `America/Los_Angeles` with the zone abbreviation and occurrence times in the event `timezone` (R-27).
- A03 venues: list with search on `name` and `city`, new, edit with `lat` and `lng` written to `location`, show with upcoming events; delete refused when events exist (the form shows them instead).
- A04 events: list with filters `status`, `host_type`, `claimed`, `stale`, `dormant`, `q`; form with every field in R-15, a host picker by name writing `host_id` and `host_name`, a venue picker, nested `event_sponsorships` (sponsor picker, `role`, `note`, `position`, six max), `slug` locked once published, host fields locked with the claimed copy when `claimed_at` is set and a crafted POST audited as `skipped_locked_fields`; schedule changes enqueue `MaterializeOccurrencesJob` once and clear `dormant_at` (R-2).
- Verify now, Confirm now, Re-materialize as `POST /admin/events/:id/verify`, `/confirm`, `/rematerialize` with confirm prompts and audit rows.
- `/admin/events/:id/occurrences`: list from 30 days back to 90 ahead, edit (sets `overridden_at`), cancel with a required note, add (the required path for `announced` events), reset override that re-materializes.
- Request specs with Capybara matchers; the 0.7 route sweep extended to every new route, including any picker JSON route.

Must pass: admin.md AC-7, AC-8, AC-9, AC-10, AC-22; AC-1, AC-2, AC-5 still pass with the new routes.

Verify:
- `pnpm --filter @curb/api test spec/requests/admin && pnpm --filter @curb/api lint`
- `bin/dev`, sign in at `/admin/sign_in`, create a venue and a weekly event hosted by a club, open its occurrences, cancel next Saturday with a note, click Re-materialize, confirm the cancelled row survives.

Out of scope: A02 dashboard, A05, A06, A08 (1.9), A07 CSV import (1.10), cover image processing beyond the Active Storage attachment field (Phase 4), A09 claim review (Phase 2, admin.md slice 7).

Notes: Pickers are plain `<select>` elements or a small `admin.js` typeahead over an admin-only JSON search route under `/admin`; no JS framework. The host picker must offer the app account (`curb`) as the default user host. Locked fields are enforced in the controller (strong params drop them), not by disabling inputs alone (AC-10). Keep `admin.css` flat and inside the 200-line budget from 0.7.

### Session 1.9: Admin CRUD for clubs, memberships, sponsors, and users

Spec: docs/specs/admin.md, slice 5 (A05, A06), the A08 half of slice 2, and the A02 half of slice 4; clubs.md slice 3 (admin part); sponsors.md slice 3 (A06 part)
Branch: feat/admin-clubs-sponsors-users
PR title: feat(api): admin CRUD for clubs, memberships, sponsors, and users, and the dashboard

Goal: an admin can seed clubs with owners, seed sponsors, manage users (role, suspend, delete), and land on a dashboard with counts, job health, the consistency report, and the stale and dormant row, while a moderator sees only what R-9 allows.

Read first: docs/specs/admin.md (R-3, R-4, R-9, R-13, R-18, R-19, R-22, Copy, AC-4, AC-11, AC-14, AC-15, AC-21), docs/specs/clubs.md (R-3, R-23, AC-6, Risks on seeded owners), docs/specs/sponsors.md (R-20, AC-7), docs/specs/auth-and-accounts.md (the `DELETE /me` path and `AccountDeletionJob`), docs/data-model.md (clubs, club_memberships, sponsors, users)

Deliverables:
- A05 clubs: list, new, edit with every field in R-18 (`home_lat` and `home_lng` to `home_location`, six `links` fields, `join_policy`, `status`, `verified`, avatar and banner attachments), hide and verify actions; `/admin/clubs/:id/memberships` listing memberships, add by handle with `role`, change role, remove, with the single-owner rule surfacing as the A05 owner error; a new club gets the app account as owner unless another handle is given.
- A06 sponsors: list, new, edit with every field in R-19, hide and verify, show with hosted and sponsored events.
- A08 users: search on `handle` and `email`, show identities, session count, role, status, hosted events; role change (admin only, never on oneself, the locked copy), suspend and unsuspend (deletes sessions in one transaction, R-3), delete through the `DELETE /me` path (R-4).
- A02 dashboard: the counts in R-13, job health for the three nightly jobs, the latest `HostConsistencyJob` report from 1.5, the stale and dormant row linking to `/admin/events?stale=1`; moderator gating per R-9 on every new screen.
- Request specs for all four screens including the moderator matrix (AC-4 rerun), audit rows on every write, the route sweep extended.

Must pass: admin.md AC-4, AC-11, AC-14, AC-15, AC-21 (with factory data; the real-seed run is 1.10); clubs.md AC-6 and sponsors.md AC-7 end to end through the admin form; events-and-occurrences.md AC-12 (the admin rename half).

Verify:
- `pnpm --filter @curb/api test spec/requests/admin && pnpm --filter @curb/api lint`
- `bin/dev`, create a club with yourself as owner and rename it, confirm its events show the new `host_name`, suspend a test user, open `/admin` and check the three job rows and the stale row link.

Out of scope: A07 CSV import (1.10), A09 claims and A10 moderation (Phase 2, admin.md slices 7 and 8), club or sponsor self-service (Phase 7), sponsorships on the event form (1.8).

Notes: The dashboard reads the consistency report and last-run times from wherever 1.5 stored them; show "No run yet" when the key is missing rather than failing. Renames from A05 and A06 exercise the `after_update` callbacks from 1.1; the specs must assert `host_name` on events, not only on the club or sponsor row. Deleting a user goes through `AccountDeletionJob`; a raw `destroy` is a review reject (R-4).

### Session 1.10: Seed importer, CSV seeds, and the first twenty verified meets

Spec: docs/specs/events-and-occurrences.md, slice 6; docs/specs/admin.md, slice 6 (A07); clubs.md slice 3 and sponsors.md slice 3 (CSV seed columns)
Branch: feat/api-seed-importer
PR title: feat(api): CSV seed importers with dry run, the admin import screen, and the first twenty meets

Goal: `Seeds::EventRowImporter`, `ClubRowImporter`, `SponsorRowImporter`, and `VenueRowImporter` validate a whole file before writing, upsert on their natural keys, report per row, and run from both `bin/rails seeds:import[path]` and A07 with preview then apply; `db/seeds/events.csv`, `clubs.csv`, and `sponsors.csv` load the first twenty verified meets on a fresh database.

Read first: docs/specs/events-and-occurrences.md (Seeds and jobs R-29, R-30, R-32, R-28, Data CSV format, Copy importer rows, AC-20, AC-21, Verification seed check), docs/specs/admin.md (R-20, R-21, Data CSV table and import order, Copy A07 rows, AC-12, AC-13, Risks on upload purge), docs/specs/sponsors.md (R-20), docs/local-development.md (Database), docs/gaps-and-open-questions.md (items 6, 8, 15)

Deliverables:
- `Seeds::EventRowImporter.call(file, dry_run:)` per R-29: full-file validation before any write, a per-row report with `action` in `create`, `update`, `skip`, `error` and the exact row-error copy, upsert on `slug`, host resolution (`user`, `club`, `sponsor`, blank means the app account), `Venues::Deduper` for venues, `event_sponsorships` from the `sponsors` column, `verified_at` and `last_confirmed_at` from `verified_date` moving only forward, host and `claimed_at` columns skipped on claimed events, the materializer enqueued per created or rescheduled event.
- `Seeds::ClubRowImporter`, `SponsorRowImporter`, `VenueRowImporter` with the admin.md column lists and natural keys, sharing one `Seeds::BaseImporter` and one `Seeds::Report`.
- `lib/tasks/seeds.rake` with `seeds:import[path]` printing the report; `db/seeds.rb` importing `venues.csv` (if present), `sponsors.csv`, `clubs.csv`, `events.csv` in that order.
- A07 at `/admin/seeds`: one file plus `kind`, stored as an Active Storage blob, a dry-run preview with the A07 heading copy, apply on a second submit carrying the signed blob id, a results page, the 500-row limit with its copy, an `import_csv` audit row with counts; `PurgeSeedUploadsJob` after 24 hours.
- Spec fixtures under `spec/fixtures/seeds/` (the 12-row coastal and Inland Empire file for AC-20 with its two bad rows, a 3-row clubs file, a 2-row sponsors file, a 501-row generator) and importer, task, and admin request specs.
- `apps/api/db/seeds/events.csv` with the first twenty rows (ten coastal Orange County, ten Inland Empire), and `clubs.csv` and `sponsors.csv` with every club and sponsor those rows reference, each event row carrying `verification_source_url` and `verified_date`.

Must pass: events-and-occurrences.md AC-20, AC-21, and the seed check in its Verification (import on a fresh database, then AC-1 and AC-3 style requests from Newport Beach and Fontana return real meets); admin.md AC-12, AC-13; admin.md AC-21 rerun against the real seeds.

Verify:
- `pnpm --filter @curb/api test spec/services/seeds spec/tasks/seeds_spec.rb spec/requests/admin/seeds_spec.rb && pnpm --filter @curb/api lint`
- `bin/rails db:reset && bin/rails seeds:import[db/seeds/events.csv]` twice (second run all `skip`), then `curl -s 'localhost:3000/v1/events?near=33.6172,-117.9270'` and `near=34.1065,-117.4356`, then open `/admin` and re-upload the same file in `/admin/seeds` preview.

Out of scope: the remaining thirty meets (by hand in the CSV and through A04 on Saturdays after this session), cover images in seeds (gaps item 15, never), the link importer (Phase 3, import-from-link.md), venue timezone lookup (Phase 2).

Notes: The twenty rows are written by Amir from `docs/research/market-research.md` section 4 and on-the-ground verification; this session builds the importer and the spec fixtures, not the research, and must not invent, guess, or fill in a meet. If the twenty rows are not ready when the session runs, commit the importers with the fixtures, leave `db/seeds/events.csv` with the header plus whatever rows exist, and say so in the stopping note. Import order matters: sponsors and clubs before events, because an unknown `host_slug` or sponsor slug is a row error. Fixture coordinates for specs come from the events spec's AC section; the real seeds carry real lot coordinates.

### Session 1.11: Mobile onboarding and Home feed

Spec: docs/specs/discovery.md, slices 3 (S01) and 4 (S02, EventCard); the feed section cards from clubs.md slice 4 (R-17) and sponsors.md slice 4 (R-16)
Branch: feat/mobile-onboarding-feed
PR title: feat(mobile): onboarding with the area picker and the sectioned Home feed

Goal: on a fresh install a person picks an area in three cards without an account, Home shows the API's sections in order with the event card carrying the Host chip, and the last feed survives airplane mode behind a saved-results banner.

Read first: docs/specs/discovery.md (Data R-1 to R-4, Mobile R-10 to R-14, Screens S01 and S02, Copy, AC-8 to AC-13, Verification), docs/specs/clubs.md (R-17, Copy feed row), docs/specs/sponsors.md (R-16, AC-16, Copy feed rows), docs/screens.md (S01, S02, Standard states), docs/mobile-liquid-glass.md section 5 (Data layer, Location) and section 6 (Feed), docs/specs/events-and-occurrences.md (Copy card chips), brand/brand-guide.md section 6 (where the serif appears)

Deliverables:
- `@curb/api-client` hooks `useFeed(near, radiusKm)` and `useUpdateDevice` with shared query keys; the MMKV persister for TanStack Query wired in the root layout; a `useBrowseLocation` hook that rounds to two decimals and never hands precise coordinates to a query.
- S01 as a first-launch modal: three cards with Skip, the in-app explainer before the reduced-accuracy system prompt (`Location.Accuracy.Lowest`, the purpose string in `app.config.ts`), Pick a city (MapKit geocoding on device), Drop a pin, the default region on offline or geocode failure, interests stored on device only; the chosen area persisted and sent as `home_location` on `POST /devices` or `PATCH /devices/:anonymous_id`.
- S02 Home: a `FlashList` of sections in API order with the section titles from Copy, absent sections hidden, pull to refresh, the widen-radius empty state (32 to 80 km) only when the response has no sections, the offline banner from cache, error with retry; `ClubCard` and `SponsorCard` rows of identical weight for `clubs_nearby` and `sponsors_nearby` with no "Sponsored" label; the `following` kind rendered as nothing in this phase.
- `EventCard` and `HostChip` in `apps/mobile/src/components`: cover or the flat placeholder, serif title, day and time in the venue timezone, venue and miles, host chip from the one `Host` shape, recurring badge with `rrule_text`, `going_count` above zero, source pill, up to two sponsor logos, and the confirmation chip with the exact strings "Check. Last confirmed <date>." (`stale`) or "Unclaimed. Last confirmed <date>." (unclaimed and fresh); RNTL test `src/components/EventCard.test.tsx`.
- Navigation from a card to `meets/[slug]` and from the chip to `u/[handle]`, `clubs/[slug]`, `sponsors/[slug]` by `type` (the screens arrive in 1.14 and 1.15; the not-found route is acceptable until then).

Must pass: discovery.md AC-8, AC-9, AC-10, AC-11, AC-12, AC-13; sponsors.md AC-16; `pnpm --filter @curb/mobile typecheck && pnpm --filter @curb/mobile lint && pnpm --filter @curb/mobile test`.

Verify:
- `pnpm --filter @curb/mobile typecheck && pnpm --filter @curb/mobile lint && pnpm --filter @curb/mobile test src/components/EventCard.test.tsx src/features/feed`
- On a physical iPhone against staging in Marine Layer light and dark: delete the app, reinstall, run AC-8 (airplane mode, Skip through, default region, then network on and pull to refresh), AC-9 (allow location, confirm two-decimal `near` in the staging API log), AC-10 (deny, Pick a city with "Laguna Beach"), AC-11 and AC-12 (section order, widen), and the flat check rows 1 to 5 from design-system-and-theming.md Verification; screenshots under `brand/previews/phase-1/`.

Out of scope: the glass search field and S05 (1.13), the Map tab (1.12), event detail (1.14), host pages (1.15), the bell and notifications (Phase 2, notifications.md), interests as a ranking signal (Later).

Notes: Depends on 0.9's client and on 1.7 (feed) and 1.10 (seeds) deployed to staging through the 0.8 pipeline; without seeds every section is empty and AC-11 cannot be judged. Cards are opaque content surfaces from tokens with no glass in rows (docs/mobile-liquid-glass.md section 6); the header is native with a large serif title and no `headerStyle` background. Round coordinates in one place (`useBrowseLocation`) so R-1 cannot regress.

### Session 1.12: Mobile Map with clustering, filter chips, bottom sheet, and List

Spec: docs/specs/discovery.md, slices 5 and 6
Branch: feat/mobile-map-list
PR title: feat(mobile): map with client clustering, glass filter chips, the sheet, and the list

Goal: the Map tab shows the visible area's meets as pins clustered by supercluster, a three-detent sheet lists them with Soonest and Nearest sorts, four glass chips and locate-me filter both the pins and the list from one request pair, and "Search this area" refetches on demand.

Read first: docs/specs/discovery.md (Mobile R-15 to R-19, Screens S03 and S04, Copy S03 and S04 rows, AC-14 to AC-18, Risks on chips and pins), docs/mobile-liquid-glass.md sections 2.3, 4, and 6 (Map, List), docs/specs/design-system-and-theming.md (R-14, R-15), packages/ui/README.md (Map logic), brand/brand-guide.md section 4 (Map pins), docs/architecture.md section 3.4, docs/gaps-and-open-questions.md (items 21, 30)

Deliverables:
- `packages/ui/src/map`: a supercluster wrapper (radius 56 px, max zoom 16) taking MapPin rows and returning clusters and points for a bbox and zoom, with `expansionZoom(clusterId)` and bbox helpers; Vitest covering AC-14.
- `@curb/api-client` hooks `useEventsMap(bbox, filters)` and `useEvents(bbox, near, filters, sort)` with shared keys.
- S03 on `react-native-maps` (Apple Maps) filling the screen under a transparent header: fetch 300 ms after the region settles on first load, then only on the "Search this area" pill, which appears after a pan over 20 percent of the viewport or one zoom level; pins in the `now`, `today`, `upcoming`, `recurring` styles from the `pin*` roles, no `past` pins; cluster tap zooms to expansion; pin tap selects (1.2x, `textPrimary` ring) and scrolls its card into view; card tap recenters and selects; loading, empty ("Nothing here this weekend." with Show all upcoming), error, offline (last pins, pill disabled), and truncated (zoom-in notice in the sheet) states.
- Four chips (This weekend, Distance with 10, 20, 50 miles, Theme with the nine options, Recurring only) in one `GlassContainer` and locate-me in another, both through the `Surface` primitive with the blur or solid fallback; filters drive both queries with `tags[]`, `recurring`, `from`, `to`, `radius_km`.
- The sheet with peek (count), half, and full detents; the full detent is S04 with Soonest and Nearest (`sort=date|distance`, Nearest only when a `near` exists) and opaque rows reusing `EventCard`.

Must pass: discovery.md AC-14, AC-15, AC-16, AC-17, AC-18; `pnpm --filter @curb/ui test packages/ui/map`.

Verify:
- `pnpm --filter @curb/ui test packages/ui/map && pnpm --filter @curb/mobile typecheck && pnpm --filter @curb/mobile lint && pnpm --filter @curb/mobile test src/features/map`
- On a physical iPhone against staging in Marine Layer light and dark: AC-15 (pan half a viewport, one request on pill tap), AC-16 (pin then card selection), AC-17 (JDM plus Recurring only sends one request pair), AC-18 with the API stubbed to `truncated: true`; check the chips over satellite tiles with Reduce Transparency on, and the flat check rows 1 to 4; screenshots under `brand/previews/phase-1/`.

Out of scope: the Spots layer and `GET /spots/map` (Phase 4, discovery.md slice 8), the search field on Map (1.13), server-side clustering (a documented upgrade path only), the web map W05 (1.17, which reuses `packages/ui/map`).

Notes: Depends on 0.9's client and on 1.3 and 1.10 deployed to staging. `expo-glass-effect` and `expo-blur` may only be imported under `apps/mobile/src/ui` (design-system-and-theming.md R-14); build the chips on `Surface`. If frame drops appear over satellite tiles, collapse Theme and Distance into one Filters chip that opens a sheet and say so in the PR (discovery.md Risks). The 500-pin cap is handled by showing what arrived plus the notice; never page the map endpoint.

### Session 1.13: Mobile Search

Spec: docs/specs/discovery.md, slice 7; the Sponsors group from sponsors.md slice 4 (R-17, AC-17) and the Clubs group from clubs.md slice 4 (R-18)
Branch: feat/mobile-search
PR title: feat(mobile): search with recents, grouped results, search everywhere, and place jump

Goal: the glass search field on Home and Map opens S05, which shows recents when empty, groups results as Events, Clubs, Sponsors, Places after a 250 ms debounce with two characters, offers Search everywhere and Add a meet on no results, and jumps the map to a picked place.

Read first: docs/specs/discovery.md (Mobile R-20, R-21, Screens S05, Copy S05 rows, AC-20 to AC-22), docs/specs/sponsors.md (R-17, AC-17, Copy search group), docs/specs/clubs.md (R-18, Copy search group), docs/mobile-liquid-glass.md section 2.2 (search bars) and section 6 (List), docs/screens.md (S05), docs/api.md (Events `q`, Clubs, Sponsors)

Deliverables:
- `@curb/api-client` hooks `useSearchEvents`, `useSearchClubs`, `useSearchSponsors` over `GET /events?q=`, `GET /clubs?q=`, `GET /sponsors?q=` with `near` and `radius_km`, and a `useDebouncedQuery` (250 ms, two-character minimum) in `apps/mobile/src/hooks`.
- The native search field (`headerSearchBarOptions`) on Home and Map presenting S05 as a modal with the placeholder "Search meets, clubs, places".
- S05: up to ten recents in MMKV under the "Recent" header when empty; one request per group after the debounce; groups Events (`EventCard` rows), Clubs (`ClubCard`), Sponsors (`SponsorCard`, after Clubs), Places (MapKit geocoding on device, no API call); loading, no results with the exact copy and both actions, error, offline ("Searching saved results only." over cached rows).
- Search everywhere repeats the events query without `near`; Add a meet opens the Create tab (the S06 placeholder from 0.4 until Phase 2); picking a place closes S05 and centers S03 on it with a fresh fetch.
- Jest tests for the debounce hook and the recents store.

Must pass: discovery.md AC-20, AC-21, AC-22; sponsors.md AC-17.

Verify:
- `pnpm --filter @curb/mobile typecheck && pnpm --filter @curb/mobile lint && pnpm --filter @curb/mobile test src/features/search src/hooks`
- On a physical iPhone against staging in Marine Layer light and dark: AC-20 with two recents then "corona" (one request per group in the staging log), AC-21 with a nonsense query then Search everywhere, AC-22 picking "Dana Point", and "lido" showing Lido Coffee under Sponsors after Clubs (sponsors.md AC-17); flat check rows 1 to 5; screenshots under `brand/previews/phase-1/`.

Out of scope: the Spots group (Phase 4, discovery.md slice 8), web search on W02 (1.16), `GET /venues/search` as a place source (1.7 built it for the Phase 2 venue picker; S05 uses MapKit per discovery.md R-20), ranking beyond API order.

Notes: Depends on 0.9's client and on 1.6, 1.7, and 1.10 deployed to staging so "corona" and "lido" return rows. The search bar is system chrome (glass comes from the native header); the results list is opaque content. Result rows reuse the 1.11 cards; club and sponsor taps land on 1.15's pages, and on not-found until that merges, which is acceptable for this PR.

### Session 1.14: Mobile Event detail (Phase 1 blocks)

Spec: docs/specs/event-detail-and-rsvp.md, slices 2 and 3 (Phase 1); the sponsors block data rules from sponsors.md (R-9, R-14); the `dormant` and `announced` copy from events-and-occurrences.md
Branch: feat/mobile-event-detail
PR title: feat(mobile): event detail with directions, add to calendar, share, source, sponsors, and deep links

Goal: opening a meet from a card, a pin, a search row, or a `curb://meets/:slug` link shows every Phase 1 block in order under a transparent header, gets directions and a calendar entry in one tap each, shares the canonical URL, and renders cancelled, unclaimed, stale, dormant, unlisted, and no-longer-listed states with the spec's copy.

Read first: docs/specs/event-detail-and-rsvp.md (Mobile R-11 to R-15, R-18 first half, R-19, R-20, R-23, R-25, Screens S08, Copy, AC-9, AC-10, AC-13, AC-15, AC-17, AC-18, Risks), docs/specs/events-and-occurrences.md (Copy detail rows, R-22, R-27), docs/specs/sponsors.md (R-14, Copy roles and note), docs/mobile-liquid-glass.md section 6 (Event detail), docs/screens.md (S08, S09 route for date rows), docs/components/primary-cta.md (to leave room for the Phase 2 CTA), apps/mobile/README.md (Integration points, deep links)

Deliverables:
- `@curb/api-client` hooks `useEvent(slug, token?)` and `useEventOccurrences(id)`; the `packages/ui` links module with `SHARE_BASE_URL`, `canonicalEventUrl(slug, token?)`, and the share text builder ("Back Bay Coffee, Sat 7:30 am. https://...").
- `meets/[slug]` on the root stack with the zoom transition and a transparent header (back and share as system toolbar items): cover with the title on a `scrim`; when (next occurrence in the venue timezone, `rrule_text`, "Next dates" rows pushing `occurrences/[id]` as a Phase 1 stub that shows the date, "Last confirmed <date>" past 30 days, Add to calendar through `expo-calendar` writing one event with the recurrence rule after permission, with the denied copy); where (static map snippet, address, `parking_note` when present, Directions opening Apple Maps with coordinates and name); host (the one `Host` shape, `kind` label for sponsors, "Claimed" or the unclaimed line, `external_host_name` beside the app account, tap to `u/`, `clubs/`, `sponsors/` by `type`; no Follow, no claim action); sponsors (only when non-empty, role labels and note, tap to S14); going (counts only and the zero copy, no CTA yet); about; source card with "Open the original" in the system browser; photos and comments placeholders.
- States: the cancelled next-occurrence banner with `override_note` (and the no-note variant), the dormant line from the events spec, announced with no dates, unlisted through `?token=` passed to the API, offline "Showing a saved copy.", error with retry, and the "no longer listed" page for 404 or 410 with the `nearby` cards and chrome intact.
- Share through the system share sheet with the canonical URL (plus `token` when unlisted), the event URL when the current occurrence is cancelled; the "Share to story" row hidden until Phase 2.
- Linking config for `curb://meets/:slug`, `curb://occurrences/:id`, and the universal link paths; RNTL tests under `src/features/meet-detail` for AC-13 and the no-longer-listed page.

Must pass: event-detail-and-rsvp.md AC-9, AC-10, AC-13, AC-15, AC-17, AC-18 (or recorded as blocked on the domain, see Notes).

Verify:
- `pnpm --filter @curb/mobile typecheck && pnpm --filter @curb/mobile lint && pnpm --filter @curb/mobile test src/features/meet-detail && pnpm --filter @curb/ui test packages/ui/src/links`
- On a physical iPhone against staging in Marine Layer light and dark: AC-9 on a seeded unclaimed meet with two sponsors, AC-10 (Directions, then Add to calendar with permission), AC-15 by a `curb://meets/<gone-slug>` deep link, AC-17 on an unlisted link, AC-18 from Notes if the domain is live; Reduce Motion on for the transition; flat check rows 1 to 5; screenshots under `brand/previews/phase-1/`.

Out of scope: RSVP, the primary CTA, Interested, S09 as a full screen, S10 (Phase 2, event-detail-and-rsvp.md slice 5), Follow and Claim on the host block and "Still happening?" (Phase 2, slice 6), S34 story card (Phase 2), real photos and comments (Phase 4, slice 7), web W03 (1.16).

Notes: Depends on 0.9's client and on 1.4, 1.6, and 1.10 deployed to staging. AC-18 needs the AASA from 1.17 on the domain in `ios.associatedDomains`, which is unconfirmed (gaps item 2); if it is not live, verify the `curb://` routes, record AC-18 as blocked in the PR, and 1.17's device step rechecks it. Nothing tinted besides the future CTA: the hero scrolls under a transparent header and every block is opaque (docs/mobile-liquid-glass.md section 6). Leave a `GoingBlock` slot where the Phase 2 CTA goes so slice 5 does not reflow the screen. The 410 body's `nearby` rows reuse `EventCard`.

### Session 1.15: Mobile Club page, members, Sponsor page, and read-only Profile

Spec: docs/specs/clubs.md, slice 4; docs/specs/sponsors.md, slice 4 (S14 and navigation; the feed row was 1.11 and the search group 1.13); docs/specs/profiles-and-follow.md, Phase 1 scope of S11 (the Session breakdown has no Phase 1 mobile row and slice 5 is the Phase 2 full layout, so build only what Scope lists for Phase 1)
Branch: feat/mobile-host-pages
PR title: feat(mobile): club page and members, sponsor page, and the read-only profile

Goal: every host chip and sponsorship row lands on a real page: S12 with the members preview and upcoming meets, S13 paginated with role labels, S14 with the kind label and Hosts or Sponsors rows, and S11 read-only with socials that open the native apps, all without an account.

Read first: docs/specs/clubs.md (Mobile R-14 to R-16, Screens S12 and S13, Copy, AC-10, Risks on seeded owners), docs/specs/sponsors.md (Mobile R-14, R-15, R-18, Screens S14, Copy, AC-13, AC-14, AC-18, Verification), docs/specs/profiles-and-follow.md (Scope Phase 1, R-16 to R-18, Copy S11 rows, AC-12, AC-13), docs/api.md (Club, Sponsor, Profile), docs/screens.md (S11 to S14), brand/brand-guide.md section 6 (serif on host names)

Deliverables:
- `@curb/api-client` hooks `useClub`, `useClubEvents`, `useClubMembers`, `useSponsor`, `useSponsorEvents`, `useProfile`, `useProfileEvents`, `useProfileClubs` with shared keys.
- S12 `clubs/[slug]`: banner, avatar, serif name, verified badge, home label, description, links, the members row with the first eight avatars and the count copy (no "Owner" label when the owner is the `curb` account), follower count, upcoming meets (three, "See all" to a List filtered by `host=club:<id>`), a reserved slot for the Phase 2 Follow button with nothing rendered, hidden (404) as "This club is no longer listed.", loading, error, offline.
- S13 `clubs/[slug]/members`: active members with Owner and Admin labels, cursor pagination, the empty copy.
- S14 `sponsors/[slug]`: banner, logo, name, verified, the kind label (Sponsor, Vendor, Venue partner), home label, tagline, description, Website in the in-app browser, icon links, follower count, Upcoming with Hosts or Sponsors labels and "See all meets" to a List filtered by `sponsor=<id>`, the footer line with the support email, hidden, error, and no-upcoming states; no create or edit surface anywhere.
- S11 `u/[handle]` read-only: avatar, display name, handle, home label, the Host badge when `is_host`, bio, a socials row opening `instagram.com/<h>`, `youtube.com/@<h>`, `tiktok.com/@<h>`, `x.com/<h>`, `threads.net/@<h>` through `Linking.openURL` and the website in `expo-web-browser`, Clubs chips with Owner or Admin, hosted meets; the followers count only when `is_host`; the not-found copy; no Follow, tabs, garage, or overflow yet.
- The filtered List route (`host=` and `sponsor=` params on the 1.12 list) and RNTL tests for the kind label, the relation labels, and the socials URL builder.

Must pass: clubs.md AC-10; sponsors.md AC-13, AC-14, AC-18; profiles-and-follow.md AC-12, AC-13 (pulled forward from slice 5 for the read-only parts; slice 5 rechecks them).

Verify:
- `pnpm --filter @curb/mobile typecheck && pnpm --filter @curb/mobile lint && pnpm --filter @curb/mobile test src/features/club src/features/sponsor src/features/profile`
- On a physical iPhone against staging in Marine Layer light (clubs and sponsors specs) and Olive and Ivory dark (profiles spec): open a club from a meet card and scroll S12, open S13, open a sponsor of kind `vendor` from a card and from the S08 sponsors block, tap See all meets, open a user host and tap the Instagram and website icons, search every screen for a sponsor edit action (none); flat check rows 1 to 5; screenshots under `brand/previews/phase-1/`.

Out of scope: Follow on S11, S12, S14 (Phase 2, profiles-and-follow.md slice 7), S07 Me changes and Edit profile (Phase 2, slices 5 and 6), Garage, Going and Following tabs, block and report (Phase 2), S36 and S37 (Phase 7), web pages (1.17).

Notes: Depends on 0.9's client and on 1.6 and 1.10 deployed to staging. Seeded clubs are owned by the app account, so hide the Owner label for the `curb` handle (clubs.md Risks) and never show a fake organizer. The club and sponsor cards and pages must match frame for frame (sponsors.md Verification); build one `HostPageHeader` and vary only the kind label. `viewer.following` is always false in this phase; do not render a control that looks like Follow.

### Session 1.16: Web home, meets list, event and occurrence pages with OG and JSON-LD

Spec: docs/specs/web.md, slices 2 (W03, W04), 3 (W14), and 4 (W01, W02; W12 is 1.17), finishing the slice 1 leftovers from 0.8 (theme cookie, glass header, device cookie, api-client wiring, error boundaries)
Branch: feat/web-event-pages
PR title: feat(web): home, meets list, event and occurrence pages with OG cards and JSON-LD

Goal: `/`, `/meets`, `/meets/:slug`, `/meets/:slug/:occurrenceId`, and `/og/meets/:slug.png` render server-side from the anonymous API with `meta`, canonical rules, JSON-LD `Event` with `eventSchedule`, deep-link buttons that never call a write endpoint, the smart banner and in-app bar, and a 1200x630 card cached at the edge.

Read first: docs/specs/web.md (R-1, R-2, R-5 to R-8, R-10, R-11, R-13, R-14, R-16, R-22, R-23, Copy, AC-1 to AC-4, AC-6, AC-7, AC-9, AC-10, AC-12, Verification, Risks), docs/specs/event-detail-and-rsvp.md (R-11 block order, R-19 copy), docs/specs/design-system-and-theming.md (R-20 to R-23), apps/web/README.md (Planned structure), docs/architecture.md sections 4.2 and 4.3, docs/api.md (Event, Occurrence, Feed, Events), packages/api-client/README.md

Deliverables:
- Root layout: `tokens.css` and self-hosted `@font-face`, `data-theme` from the `curb_theme` cookie (default `marine-layer`) and scheme from `prefers-color-scheme`, glass on the header only, `pageMax` 1120 and `readingMax` 640, the `curb_device` cookie forwarded as `X-Device-Id` by `lib/api.server.ts`, route error boundaries; `API_URL`, `APP_STORE_ID`, `TEAM_ID`, `SHARE_BASE_URL` read with no committed defaults.
- `lib/seo.ts`: a `meta` builder (title, description, canonical, `og:*`, `twitter:card`, `apple-itunes-app` when `APP_STORE_ID` is set) and JSON-LD builders for `Event` (organizer by host type, `sponsor` entries, `eventStatus`, `eventSchedule` from `rrule` and `rrule_until`, none for `once`) with Vitest.
- W03 `meets.$slug.tsx`: the S08 block order, directions by platform, Add to calendar as `.ics`, Copy link, `?token=` passthrough, the cancelled banner, "Last confirmed", the unclaimed copy, photos and comments placeholders, "I'm going" and Follow as `curb://` with the 1.5 s App Store fallback, the Open in app bar for Instagram, Facebook, and Threads user agents with the 7-day dismissal; 404 and 410 thrown by the loader (the pages with nearby cards are 1.17).
- W04 `meets.$slug.$occurrenceId.tsx` with the canonical rule (self when `overridden_at`, else the event URL).
- W14 `og.meets.$slug[.png].tsx` with Satori and resvg: cover through the photo treatment or the flat placeholder, serif title, thin rule, date, venue, wordmark, no gradients, no Instagram bytes, `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`, the placeholder on a missing cover; `test:og` snapshots.
- W01 `_index.tsx` (headline, city picker over `lib/cities.ts` plus Near me, `GET /feed` near the rounded Vercel IP coordinates with the coastal Orange County fallback, the three time sections, the empty copy) and W02 `meets._index.tsx` (`q`, `city`, `tags`, `from`, canonical rules, `noindex` with `q`, the no-results copy, Add a meet as a store link).
- Playwright `test:e2e` against MSW fixtures for AC-1 to AC-4, AC-6, AC-7, AC-9, AC-10, AC-12, and `test:og`.

Must pass: web.md AC-1, AC-2, AC-3 (the 404 then 200 half; the sitemap half is 1.17), AC-4, AC-6, AC-7, AC-9, AC-10, AC-12.

Verify:
- `pnpm --filter @curb/web typecheck && pnpm --filter @curb/web test && pnpm --filter @curb/web test:e2e && pnpm --filter @curb/web test:og`
- On the Vercel preview from the PR: `curl -s <preview>/meets/<seeded-slug> | grep -c 'application/ld+json'`, fetch `/og/meets/<slug>.png` and check the headers, paste the link into iMessage and confirm the unfurl.

Out of scope: W05 map, W06 to W09, W12, W15, the 404 and 410 pages with nearby cards (1.17), the story format on W14 and legal pages (Phase 2, web.md slice 8), spots and posts (Phase 4, slice 9), any write surface (Phase 7).

Notes: Built on the app 0.8 generated; do not regenerate it. If 0.8 left the header glass and `@font-face` undone, they land here (design-system-and-theming.md R-20 to R-23 minus the web button, which waits for a write surface). Satori needs the same font files as mobile from `packages/design-tokens/fonts/` and cannot draw `backdrop-filter` or gradients, which matches the spec. `APP_STORE_ID` is unknown until App Store Connect reserves the app; the banner and fallback links render only when it is set and Playwright sets a fake id. This is the largest Phase 1 session: build in the order listed and end with a stopping note rather than skipping the JSON-LD tests.

### Session 1.17: Web profile, club, sponsor, and city pages, map, sitemap, robots, AASA, 404 and 410

Spec: docs/specs/web.md, slices 4 (W12 only), 5 (W06 to W09), 6 (W05), and 7 (W15, error pages, Playwright in CI); clubs.md slice 5; sponsors.md slice 5; profiles-and-follow.md slice 1 (W06 part)
Branch: feat/web-host-pages-sitemap
PR title: feat(web): profile, club, sponsor, city, and map pages, sitemap, robots, AASA, and error pages

Goal: every remaining Phase 1 web route exists and is crawlable: host pages with `Organization` JSON-LD, seven city pages, a client-only clustered map, a sitemap built from `GET /sitemap`, robots, the AASA that makes universal links open the app, and 404 and 410 pages with nearby meets.

Read first: docs/specs/web.md (R-4, R-9, R-12, R-15, R-17, R-18, R-21, Copy, AC-5, AC-8, AC-11, AC-14 to AC-16, AC-19, Verification, Risks), docs/specs/clubs.md (R-21, R-22, AC-12), docs/specs/sponsors.md (R-19), docs/specs/profiles-and-follow.md (R-28, AC-18), docs/api.md (System `GET /sitemap`, Clubs, Sponsors, Users and follows), packages/ui/README.md (Map logic), apps/mobile/README.md (Identifiers, for the AASA app id)

Deliverables:
- W06 `u.$handle.tsx` (the Phase 1 profile, socials as `rel="nofollow noopener"` anchors, hosted meets, clubs, Follow as an app or store link, no JSON-LD), W07 `clubs._index.tsx` (active clubs nearest first when a region is known, else by followers, the title copy), W08 `clubs.$slug.tsx` and W09 `sponsors.$slug.tsx` with `Organization` JSON-LD (`name`, `url`, `logo`, `sameAs` from `links`), the kind label, a members section, hosted and sponsored meets, hidden as 404.
- W12 `socal.$city.tsx` for the seven slugs in `lib/cities.ts`: `GET /feed?near=<center>&radius_km=16`, only the three time sections, the title and meta description copy, the empty copy, 404 for unknown slugs.
- W05 `map.tsx` client-only (`clientLoader`): MapLibre GL JS with the OpenFreeMap style from an env var, `GET /events/map` 300 ms after move end, clusters from `packages/ui/map`, the side list of events in view, truncated and empty copy, `noindex`.
- W15: `sitemap[.xml].tsx` (W01, W02, W07, W12, and every `GET /sitemap` row with `lastmod`, edge cached 1 h), `robots[.txt].tsx` (allow all, disallow `/map`, `/posts/`, `/og/`, `/new`, `/imports/`, `/sign-in`, the sitemap line), `[.well-known].apple-app-site-association.tsx` (JSON, no redirect, `applinks` and `webcredentials` for `<TEAM_ID>.club.curbsocial.app`, the components list including `/occurrences/*` and excluding `/og/*`, `/sign-in`, `/new`).
- 404 (three nearby meets from `GET /feed` by IP with the coastal fallback) and 410 (the API's `nearby` rows) pages with the header intact, wired from every route's error boundary; the Playwright suite running in the CI `js` job against MSW fixtures.

Must pass: web.md AC-3 (the sitemap half), AC-5, AC-8, AC-11, AC-14, AC-15, AC-16, AC-19; clubs.md AC-12; profiles-and-follow.md AC-18; sponsors.md slice 5 (web.md AC-5); event-detail-and-rsvp.md AC-18 rechecked if it was blocked in 1.14.

Verify:
- `pnpm --filter @curb/web typecheck && pnpm --filter @curb/web test && pnpm --filter @curb/web test:e2e`
- On the Vercel preview: `curl -sI <preview>/.well-known/apple-app-site-association`, `curl -s <preview>/sitemap.xml | head`, `curl -s <preview>/robots.txt`, `curl -s -o /dev/null -w '%{http_code}' <preview>/socal/nowhere`; on a physical iPhone with the app installed, tap a `/meets/:slug` link in Notes (AC-16) once the domain is live.

Out of scope: legal pages W16 and the story OG format (Phase 2, web.md slice 8), spots and post pages (Phase 4, slice 9), a web theme picker (Phase 7 if ever), server-side clustering, `GET /sitemap` itself (1.7).

Notes: The AASA and universal links need the confirmed domain (gaps item 2) and the associated-domains entitlement in the EAS build; until then AC-16 and 1.14's AC-18 stay recorded as blocked, and everything else here is verifiable on the preview. OpenFreeMap has no SLA; keep the style URL in an env var so MapTiler is a one-line swap. A known city with no meets stays live with the empty copy; only an unknown slug is 404 (web.md R-12 and Risks). The city centers in `cities.ts` come from 1.16; do not duplicate them.

## Phases 2 to 7

Sunday planning writes these from the "Session breakdown" table at the end of each spec, using the template above. The order inside a phase follows the spec index in `docs/specs/README.md`: data and API slices first, then admin, then mobile, then web. A slice that depends on a Meta or Apple approval (oEmbed Read, the Sign in with Apple service id, App Store Connect) is scheduled the week after the request goes in, not before.

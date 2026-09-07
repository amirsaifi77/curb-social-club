# Local Development

Status: live as of session 0.8 (2026-09-07). The API, mobile, and web apps are generated; the staging pieces below need their one-time dashboard steps (see Staging).

## Prerequisites (macOS)

| Tool | Version | Install |
|---|---|---|
| mise | latest | `brew install mise`. One tool manager for Node and Ruby. asdf works too; nvm plus rbenv is fine if already installed. |
| Node | 24 LTS (`.nvmrc`) | `mise use node@24`, or `nvm use` if nvm is already installed |
| pnpm | 9 (pinned in root `package.json` `packageManager`) | `corepack enable && corepack prepare pnpm@latest --activate` |
| Ruby | 3.3 (`.ruby-version`) | `mise use ruby@3.3` |
| Docker Desktop or OrbStack | latest | For Postgres + PostGIS only |
| libvips | latest | `brew install vips` (image processing) |
| Xcode | 26 | App Store. Needed for iOS simulators and dev builds. |
| Watchman | latest | `brew install watchman` |
| EAS CLI | latest | `pnpm add -g eas-cli` |

`mise` reads `.nvmrc` and `.ruby-version` automatically when `legacy_version_file = true` is set in `~/.config/mise/config.toml`.

## First run

```sh
git clone git@github.com:amirsaifi77/curb-social-club.git
cd curb-social-club
mise install
pnpm install                     # JS workspaces only; Rails is skipped
docker compose up -d             # Postgres 16 + PostGIS 3.4 on 5432
cp apps/api/.env.example apps/api/.env
pnpm --filter @curb/api build     # bundle install + db:prepare (creates extensions, runs migrations, seeds)
pnpm dev                         # turbo runs api, web, and mobile dev servers
```

## Per-app commands

| App | Command | Notes |
|---|---|---|
| api | `pnpm --filter @curb/api dev` | `bin/dev` runs Puma on 3000 and Solid Queue worker via `Procfile.dev` |
| api | `pnpm --filter @curb/api test` | `bundle exec rspec` |
| api | `pnpm --filter @curb/api lint` | rubocop |
| api | `pnpm --filter @curb/api openapi` | Regenerates `swagger/v1/openapi.yaml` |
| api | `cd apps/api && bin/rails c` | Console |
| api | `cd apps/api && bin/rails "admin:grant[you@example.com]"` | Make an existing user an admin (`admin:grant[email,moderator]` for the moderator role); then sign in at `/admin/sign_in` |
| web | `pnpm --filter @curb/web dev` | React Router dev server on 5173, proxies `/v1` to 3000 |
| mobile | `pnpm --filter @curb/mobile dev` | `expo start --dev-client` |
| mobile | `pnpm --filter @curb/mobile ios` | Build and run a development build on the simulator (`expo run:ios`) |
| types | `pnpm --filter @curb/types generate` | OpenAPI to TS |
| tokens | `pnpm --filter @curb/design-tokens build` | tokens.json to TS and CSS |
| all | `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` | Turbo across the workspace |

## Database

`docker-compose.yml` runs `postgis/postgis:16-3.4` with a persistent volume. Rails `database.yml` defaults to `curb:curb@localhost:5432` and honors `DATABASE_URL` when set; use the `postgis://` scheme (`postgis://curb:curb@localhost:5432/curb_social_club_development`), because a `postgres://` URL overrides the adapter back to plain postgresql. `db:prepare` enables `postgis`, `pgcrypto`, `btree_gist`, `pg_trgm`, and `citext` through the first migration.

Seeds create a moderator user, a few venues in Newport Beach, Corona del Mar, San Clemente, and Rancho Cucamonga, one recurring Saturday meet per venue, and materialized occurrences for the next 8 weeks, so the map is not empty on first launch.

## Environment variables

`apps/api/.env.example` will list every variable with a comment. Planned set:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres |
| `RAILS_MASTER_KEY` | Not used; kept unset |
| `SECRET_KEY_BASE` | Signs the `/admin` cookie session (docs/specs/admin.md R-6). Required in production (`bin/rails secret`); development and test use the generated `tmp/local_secret.txt` |
| `ACTIVE_RECORD_ENCRYPTION_PRIMARY_KEY`, `ACTIVE_RECORD_ENCRYPTION_DETERMINISTIC_KEY`, `ACTIVE_RECORD_ENCRYPTION_KEY_DERIVATION_SALT` | Active Record encryption for `identities.provider_refresh_token`; required in production, fixed non-secret fallbacks in development and test |
| `APPLE_BUNDLE_ID`, `APPLE_SERVICE_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` | Sign in with Apple verification and token revocation |
| `GOOGLE_IOS_CLIENT_ID`, `GOOGLE_ADMIN_CLIENT_ID` | Google id token audiences for the iOS app and the admin sign-in (auth-and-accounts.md Risks). The admin id is an OAuth web client whose authorized JavaScript origins include the API host (`http://localhost:3000` locally); `/admin/sign_in` shows a notice instead of the button while it is unset |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_HOST` | Active Storage |
| `EXPO_ACCESS_TOKEN` | Push |
| `RESEND_API_KEY` | Email |
| `SENTRY_DSN`, `SENTRY_ENVIRONMENT` | Sentry; the environment tag defaults to `RAILS_ENV`, `render.yaml` sets `staging` |
| `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL` | Importer fallback |
| `EVENTBRITE_TOKEN` | Eventbrite adapter |
| `GEOCODER_APPLE_KEY`, `GEOCODER_GOOGLE_KEY` | Geocoding |
| `WEB_ORIGIN` | CORS |

Mobile and web use `EXPO_PUBLIC_API_URL` and `VITE_API_URL` respectively (plus `EXPO_PUBLIC_SENTRY_DSN` and `VITE_SENTRY_DSN`, which are public keys); nothing secret lives in client bundles. The web server reads `SENTRY_DSN` and `SENTRY_TEST_ENABLED` (see `apps/web/.env.example`).

## Staging

| Tier | Where | URL |
|---|---|---|
| API | Render web service `curb-api-staging` plus worker `curb-jobs-staging` and Postgres `curb-postgres-staging` (`render.yaml`, ADR 0008), deployed from `main` after CI passes | `https://curb-api-staging.onrender.com` (`/v1/health`, `/admin/sign_in`) |
| Web | Vercel project `curb-social-club`, production from `main`, a preview per branch and PR | `https://curb-social-club-amirsaifi77.vercel.app`; previews at `curb-social-club-git-<branch>-amirsaifi77.vercel.app` |
| Mobile | EAS `development` and `preview` profiles (`apps/mobile/eas.json`) point `EXPO_PUBLIC_API_URL` at the staging API | TestFlight or internal distribution |

One-time setup, in this order (secrets live in the dashboards, never in the repo):

1. Render: Blueprints, New Blueprint Instance, this repo, branch `main`. It creates the database, the env var group `curb-staging` (prompting for the `sync: false` values: `SENTRY_DSN`, the Google client ids, the Apple keys; leave blank what does not exist yet), the web service, and the worker. `bin/render-build.sh` runs `assets:precompile` and `db:prepare` on the web service. Check `curl -s https://curb-api-staging.onrender.com/v1/health`.
2. Vercel: project settings, Root Directory `apps/web`, and the environment variables `VITE_API_URL=https://curb-api-staging.onrender.com`, `VITE_SENTRY_DSN`, `SENTRY_DSN`. Then delete the root `vercel.json` (it only disables git deployments) in a follow-up PR; that PR gets the first preview.
3. Sentry (org `amir-saifi`): create projects `curb-api` (Rails), `curb-web` (React Router), `curb-mobile` (React Native), and paste each DSN into Render, Vercel, and an EAS environment variable `EXPO_PUBLIC_SENTRY_DSN`. `SENTRY_AUTH_TOKEN` as an EAS secret turns on source map and dSYM upload through the config plugin.

Test events, one per tier:

| Tier | How |
|---|---|
| API | Render shell (or locally with `SENTRY_DSN` set): `bin/rails sentry:test_event` |
| Web | Set `SENTRY_TEST_ENABLED=1` on the deployment, open `/sentry-test` (it throws a server error), unset it |
| Mobile | Dev gallery (`/dev/gallery` in a development build), "Send Sentry test event" |

Pointing a dev build at staging: set `EXPO_PUBLIC_API_URL=https://curb-api-staging.onrender.com` in `apps/mobile/.env` for `expo run:ios`, or build with `eas build --profile development`, whose env already has it.

## Mobile dev build

Expo Go cannot load the native modules we use (maps, Apple auth, glass effects), so the first run needs a development build: `pnpm --filter @curb/mobile ios` builds locally with Xcode, or `eas build --profile development --platform ios` produces one in the cloud to install on a device. After that, `expo start --dev-client` hot reloads JS as usual.

The API on a physical device: point `EXPO_PUBLIC_API_URL` at your Mac's LAN IP, or run `ngrok http 3000` and use that URL, which also makes Apple universal link testing easier.

## Troubleshooting placeholders

Known future gotchas to document once hit: PostGIS adapter and `schema.rb` (use `structure.sql`), vips on Apple Silicon, Apple sign-in on simulator (works, but needs a signed-in Apple ID), Expo dev client and Xcode 26 beta mismatches.

# Local Development

Status: planned setup, 2026-09-05. Nothing here works yet because the apps have not been generated. This is the target so the scaffolding PRs can be checked against it.

## Prerequisites (macOS)

| Tool | Version | Install |
|---|---|---|
| mise | latest | `brew install mise`. One tool manager for Node and Ruby. asdf works too; nvm plus rbenv is fine if already installed. |
| Node | 22 (`.nvmrc`) | `mise use node@22` |
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
git clone git@github.com:<amir>/cars-and-coffee.git
cd cars-and-coffee
mise install
pnpm install                     # JS workspaces only; Rails is skipped
docker compose up -d             # Postgres 16 + PostGIS 3.4 on 5432
cp apps/api/.env.example apps/api/.env
pnpm --filter @cac/api build     # bundle install + db:prepare (creates extensions, runs migrations, seeds)
pnpm dev                         # turbo runs api, web, and mobile dev servers
```

## Per-app commands

| App | Command | Notes |
|---|---|---|
| api | `pnpm --filter @cac/api dev` | `bin/dev` runs Puma on 3000 and Solid Queue worker via `Procfile.dev` |
| api | `pnpm --filter @cac/api test` | `bundle exec rspec` |
| api | `pnpm --filter @cac/api lint` | rubocop |
| api | `pnpm --filter @cac/api openapi` | Regenerates `swagger/v1/openapi.yaml` |
| api | `cd apps/api && bin/rails c` | Console |
| web | `pnpm --filter @cac/web dev` | React Router dev server on 5173, proxies `/v1` to 3000 |
| mobile | `pnpm --filter @cac/mobile dev` | `expo start --dev-client` |
| mobile | `pnpm --filter @cac/mobile ios` | Build and run a development build on the simulator (`expo run:ios`) |
| types | `pnpm --filter @cac/types generate` | OpenAPI to TS |
| tokens | `pnpm --filter @cac/design-tokens build` | tokens.json to TS and CSS |
| all | `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` | Turbo across the workspace |

## Database

`docker-compose.yml` runs `postgis/postgis:16-3.4` with a persistent volume. Rails `database.yml` reads `DATABASE_URL` (`postgres://cac:cac@localhost:5432/cac_development`). `db:prepare` enables `postgis`, `pgcrypto`, `btree_gist`, `pg_trgm`, and `citext` through the first migration.

Seeds create a moderator user, a few venues in Fontana, Rancho Cucamonga, Riverside, and Irvine, one recurring Saturday meet per venue, and materialized occurrences for the next 8 weeks, so the map is not empty on first launch.

## Environment variables

`apps/api/.env.example` will list every variable with a comment. Planned set:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres |
| `RAILS_MASTER_KEY` | Not used; kept unset |
| `APPLE_BUNDLE_ID`, `APPLE_SERVICE_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY` | Sign in with Apple verification and token revocation |
| `GOOGLE_CLIENT_IDS` | Comma separated iOS and web client ids |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_HOST` | Active Storage |
| `EXPO_ACCESS_TOKEN` | Push |
| `RESEND_API_KEY` | Email |
| `SENTRY_DSN` | |
| `LLM_PROVIDER`, `LLM_API_KEY`, `LLM_MODEL` | Importer fallback |
| `EVENTBRITE_TOKEN` | Eventbrite adapter |
| `GEOCODER_APPLE_KEY`, `GEOCODER_GOOGLE_KEY` | Geocoding |
| `WEB_ORIGIN` | CORS |

Mobile and web use `EXPO_PUBLIC_API_URL` and `VITE_API_URL` respectively; nothing secret lives in client bundles.

## Mobile dev build

Expo Go cannot load the native modules we use (maps, Apple auth, glass effects), so the first run needs a development build: `pnpm --filter @cac/mobile ios` builds locally with Xcode, or `eas build --profile development --platform ios` produces one in the cloud to install on a device. After that, `expo start --dev-client` hot reloads JS as usual.

The API on a physical device: point `EXPO_PUBLIC_API_URL` at your Mac's LAN IP, or run `ngrok http 3000` and use that URL, which also makes Apple universal link testing easier.

## Troubleshooting placeholders

Known future gotchas to document once hit: PostGIS adapter and `schema.rb` (use `structure.sql`), vips on Apple Silicon, Apple sign-in on simulator (works, but needs a signed-in Apple ID), Expo dev client and Xcode 26 beta mismatches.

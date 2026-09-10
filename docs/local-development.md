# Local Development

Status: live. Phase 1 is code complete, so every app runs locally against a database with content in it. The staging pieces below still need their one-time dashboard steps (see Staging).

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
cp apps/web/.env.example apps/web/.env
cp apps/mobile/.env.example apps/mobile/.env
pnpm --filter @curb/api build    # bundle install + db:prepare (extensions, migrations)
cd apps/api && bin/rails db:seed && bin/rails seeds:dev && cd ../..
pnpm dev                         # turbo runs api, web, and mobile dev servers
```

`.env` files are gitignored. Every variable in an `.env.example` has a safe default or turns off the feature it configures, so the copies work unedited.

## Per-app commands

| App | Command | Notes |
|---|---|---|
| api | `pnpm --filter @curb/api dev` | `bin/dev` runs Puma on 3000 and Solid Queue worker via `Procfile.dev` |
| api | `pnpm --filter @curb/api test` | `bundle exec rspec` |
| api | `pnpm --filter @curb/api lint` | rubocop |
| api | `pnpm --filter @curb/api openapi` | Regenerates `swagger/v1/openapi.yaml` |
| api | `cd apps/api && bin/rails c` | Console |
| api | `cd apps/api && bin/rails db:seed` | The app account, then any verified rows in `db/seeds/*.csv` |
| api | `cd apps/api && bin/rails seeds:dev` | The fabricated rows in `db/seeds/dev/`, so the screens are not empty. Refuses to run in production |
| api | `cd apps/api && bin/rails seeds:dev:clear` | Remove every row `seeds:dev` wrote, including the venues no slug prefix reaches |
| api | `cd apps/api && bin/rails "admin:grant[you@example.com]"` | Make an existing user an admin (`admin:grant[email,moderator]` for the moderator role); then sign in at `/admin/sign_in` |
| api | `cd apps/api && bin/rails runner 'MaterializeOccurrencesJob.perform_now'` | Expand every published event's schedule 90 days ahead (nightly at 02:00 Pacific) |
| api | `cd apps/api && bin/rails runner 'HostConsistencyJob.perform_now'` | Report events whose host is missing or hidden and rewrite drifted `host_name` (02:30). Prints a summary line; the report is cached for the admin dashboard |
| api | `cd apps/api && bin/rails runner 'SeedDecayJob.perform_now'` | Send unclaimed events unconfirmed for 90 days dormant (02:45). Prints the count and slugs. All three jobs are idempotent, so running them by hand is safe |
| web | `pnpm --filter @curb/web dev` | React Router dev server on 5173, proxies `/v1` to 3000 |
| mobile | `pnpm --filter @curb/mobile dev` | `expo start --dev-client` |
| mobile | `pnpm --filter @curb/mobile ios` | Build and run a development build on the simulator (`expo run:ios`) |
| types | `pnpm --filter @curb/types generate` | OpenAPI to TS |
| tokens | `pnpm --filter @curb/design-tokens build` | tokens.json to TS and CSS |
| all | `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` | Turbo across the workspace |

## Database

`docker-compose.yml` runs `postgis/postgis:16-3.4` with a persistent volume. Rails `database.yml` defaults to `curb:curb@localhost:5432` and honors `DATABASE_URL` when set; use the `postgis://` scheme (`postgis://curb:curb@localhost:5432/curb_social_club_development`), because a `postgres://` URL overrides the adapter back to plain postgresql. `db:prepare` enables `postgis`, `pgcrypto`, `btree_gist`, `pg_trgm`, and `citext` through the first migration.

### Getting rows into it

Two commands, and they are not the same thing.

`bin/rails db:seed` creates the app account and imports `db/seeds/*.csv`, which hold rows somebody verified against the organizer's own post on `verified_date` (events spec R-30). Those files carry their headers and no rows yet, so on a fresh database this leaves you with an empty app.

`bin/rails seeds:dev` imports `db/seeds/dev/`: seven fabricated meets, one per launch city, covering every cadence except `announced` and all three host types plus the app account, with two clubs, two sponsors, and two people. Each row also gets a placeholder picture from `db/seeds/dev/images/` (a cover per event, an avatar and banner per club, a logo and banner per sponsor), so the cards and host pages show their photo-first layout. This is what puts content on the screens. It refuses to run in production, every slug starts `dev-`, every `verification_source_url` points at `example.invalid`, every picture says it is a placeholder, and `db/seeds/dev/README.md` lists the rest of the signals that keep fixture rows apart from verified ones.

Attachment URLs in API payloads are absolute on the host the request came in on (`http://localhost:3000/rails/active_storage/...` from the simulator or the web app), so point `EXPO_PUBLIC_API_URL` and `VITE_API_URL` at a host the device can reach, which for a physical phone is the machine's LAN address rather than `localhost`.

`bin/rails seeds:dev:clear` removes them again. The `dev-` prefix is not by itself a way to find every fixture row (venues, occurrences, memberships, and sponsorships carry no marker, and `_` is a `LIKE` wildcard), which is why the clear task exists rather than a documented query; `db/seeds/dev/README.md` has the detail.

The dev rows are ERB templates rather than plain CSVs because their dates have to stay current: a fixed `verified_date` would age every meet into staleness (R-25) and then dormancy (R-26), which drops it out of every list. Re-run `seeds:dev` any time; rows upsert on their slug and the dates re-render against the day you run it.

Occurrences come from `MaterializeOccurrencesJob`, which creating an event enqueues. Something has to run it: `bin/dev` starts a Solid Queue worker alongside Puma, so they appear on their own. `bin/rails server` alone does not, and neither does reading the event, which only enqueues the job again. Without a worker, run it by hand from the table above.

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

Mobile and web use `EXPO_PUBLIC_API_URL` and `VITE_API_URL` respectively (plus `EXPO_PUBLIC_SENTRY_DSN` and `VITE_SENTRY_DSN`, which are public keys); nothing secret lives in client bundles. `apps/web/.env.example` and `apps/mobile/.env.example` are the full lists. The ones that change behavior rather than turn a feature on:

| Variable | App | What it does |
|---|---|---|
| `API_URL` | web | Read at runtime by the server loaders. `VITE_API_URL` is a separate, build-time value that Vite inlines into the bundles; setting one does not set the other |
| `SHARE_BASE_URL` | web | The public origin. Unset omits canonical and OG links rather than pointing them at the wrong host (web.md R-23) |
| `MAP_STYLE_URL` | web | Tile style for the map. Unset falls back to OpenFreeMap, which has no SLA |
| `TEAM_ID` | web | Apple team id. Unset makes `/.well-known/apple-app-site-association` a 404, which is deliberate: Apple caches the file, so a placeholder would break universal links for as long as the cache holds |
| `APP_STORE_ID` | web | Unset hides the smart banner and the App Store fallback links |
| `EXPO_PUBLIC_API_URL` | mobile | Where the app calls. Metro inlines it at bundle time, so restart Metro after a change |

The web server also reads `SENTRY_DSN` and `SENTRY_TEST_ENABLED`, which are server side rather than bundled.

## Staging

| Tier | Where | URL |
|---|---|---|
| API | Render web service `curb-api-staging` plus worker `curb-jobs-staging` and Postgres `curb-postgres-staging` (`render.yaml`, ADR 0008), deployed from `main` after CI passes | `https://curb-api-staging.onrender.com` (`/v1/health`, `/admin/sign_in`) |
| Web | Vercel project `curb-social-club`, production from `main`, a preview per branch and PR | `https://curb-social-club-amirsaifi77.vercel.app`; previews at `curb-social-club-git-<branch>-amirsaifi77.vercel.app` |
| Mobile | EAS `development` and `preview` profiles (`apps/mobile/eas.json`) point `EXPO_PUBLIC_API_URL` at the staging API | TestFlight or internal distribution |

One-time setup, in this order (secrets live in the dashboards, never in the repo):

1. Sentry (org `amir-saifi`): create projects `curb-api` (Rails), `curb-web` (React Router), `curb-mobile` (React Native) and keep the three DSNs for the next steps; the mobile one goes into an EAS environment variable `EXPO_PUBLIC_SENTRY_DSN`. `SENTRY_AUTH_TOKEN` as an EAS secret turns on source map and dSYM upload through the config plugin.
2. Render: Blueprints, New Blueprint Instance, this repo, branch `main`. It creates the database, the env var group `curb-staging` (prompting for the `sync: false` values: the API DSN, the Google client ids, the Apple keys; leave blank what does not exist yet), the web service, and the worker. `bin/render-build.sh` runs `assets:precompile`, `db:migrate`, and `db:seed` on the web service; the worker may restart until that first migration lands. Check `curl -s https://curb-api-staging.onrender.com/v1/health` (503 means Puma is up but the database is not), and that `request.remote_ip` in the logs is a client address, not Render's proxy (otherwise set `config.action_dispatch.trusted_proxies` so rack-attack keys on real IPs).
3. Vercel: project settings, Root Directory `apps/web`, and the environment variables `VITE_API_URL=https://curb-api-staging.onrender.com`, `VITE_SENTRY_DSN`, `SENTRY_DSN`. The next push to any branch gets a preview and `main` a production deploy. Then delete the root `vercel.json` (it only disabled git deployments while the project built from the repo root).

Test events, one per tier:

| Tier | How |
|---|---|
| API | Render shell (or locally with `SENTRY_DSN` set): `bin/rails sentry:test_event` |
| Web | Set `SENTRY_TEST_ENABLED=1` on the deployment, open `/sentry-test` (it throws a server error), unset it |
| Mobile | Dev gallery (`/dev/gallery` in a development build), "Send Sentry test event" |

Pointing a dev build at staging: set `EXPO_PUBLIC_API_URL=https://curb-api-staging.onrender.com` in `apps/mobile/.env` for `expo run:ios`, or build with `eas build --profile development`, whose env already has it.

## Run on the iOS Simulator

macOS with Xcode only. Expo Go cannot load the native modules this app uses (maps, Apple auth, glass effects), so the first run needs a development build.

Once, from the repo root, assuming First run above is done:

```sh
docker compose up -d
cd apps/api && bin/rails db:seed && bin/rails seeds:dev && cd ../..
```

Then two terminals, both from the repo root:

```sh
pnpm --filter @curb/api dev      # Puma on 3000 plus a Solid Queue worker
pnpm --filter @curb/mobile ios   # expo run:ios, then Metro
```

`expo run:ios` prebuilds the native project into `apps/mobile/ios/` (gitignored, generated from `app.config.ts`), builds it with Xcode, installs it on a booted simulator, and starts Metro. The first build takes several minutes; later ones are incremental. After that `pnpm --filter @curb/mobile dev` is enough, and `expo run:ios` again only after a change to `app.config.ts`, a config plugin, or a native dependency.

### Building on EAS instead

```sh
cd apps/mobile
eas build --profile simulator --platform ios
```

The `simulator` profile in `eas.json` extends `development`, sets `ios.simulator: true` so the artifact is a `.app` for the simulator rather than an `.ipa` for a device, and overrides `EXPO_PUBLIC_API_URL` back to `http://localhost:3000`. That override matters when the app is opened without Metro attached, which falls back to the bundle built with the profile's `env`; inherited, it would have pointed at a staging API that is not deployed.

Download the artifact, drag it onto a booted simulator, then run `pnpm --filter @curb/mobile dev` and open the app. Use this when you would rather not build locally, or want to hand the same build to somebody else.

This route needs an EAS project first: `eas login` then `eas init` in `apps/mobile`, which writes `extra.eas.projectId` into the app config. Neither exists yet (`docs/STATUS.md` still lists EAS under accounts to set up), so `expo run:ios` is the route that works today.

### Pointing the app at an API

The simulator shares the host's network, so `http://localhost:3000` reaches a Rails server on the same Mac. That is the default in `apps/mobile/.env.example` and what `EXPO_PUBLIC_API_URL` should stay at for local work.

`EXPO_PUBLIC_*` variables are inlined by Metro when it bundles, so a dev client reads `apps/mobile/.env` from your machine, not the `env` block in `eas.json`. Restart Metro after changing one.

A physical device on the same Wi-Fi needs the LAN address rather than `localhost` (`EXPO_PUBLIC_API_URL=http://192.168.1.x:3000`, with Rails listening on `-b 0.0.0.0`), or `ngrok http 3000`, which also makes universal link testing easier. For staging, set `EXPO_PUBLIC_API_URL=https://curb-api-staging.onrender.com`, or build with `eas build --profile development`, whose env already has it.

### What the simulator cannot do

| Surface | Why |
|---|---|
| Sign in with Apple | Works, but needs an Apple ID signed in to the simulator, and a real one for token verification. Test on a device. |
| Universal links | Need the confirmed domain serving the AASA and the associated-domains entitlement in a real build (gaps item 2). The `curb://` scheme works: `xcrun simctl openurl booted curb://meets/dev-harbor-coffee-run` |
| Push notifications | Not wired up yet: `expo-notifications` is not a dependency. Simulators on Xcode 14 and later can receive them, so this is a schedule limit rather than a simulator one |
| Camera | Use the photo library instead |

## Troubleshooting

| Symptom | Cause |
|---|---|
| `PG::ConnectionBad` | `docker compose up -d` has not run, or something else holds 5432 |
| Every geo query fails | `DATABASE_URL` uses `postgres://` rather than `postgis://`, which switches the adapter back to plain postgresql |
| A migration writes `schema.rb` | The app uses `structure.sql`; check `config.active_record.schema_format` |
| The apps show nothing | `bin/rails seeds:dev` has not run. Check `curl "http://localhost:3000/v1/feed?near=33.62,-117.93"` |
| A meet has no dates on it | No Solid Queue worker, so `MaterializeOccurrencesJob` never ran. Use `bin/dev` rather than `bin/rails server`, or run the job by hand |
| The web map is empty and the console says CORS | `WEB_ORIGIN` is unset on the API. The Vite dev server is allowed automatically in development, so this only bites on a deployment |
| Metro cannot resolve a workspace package | pnpm symlinks. Add `node-linker=hoisted` to `apps/mobile/.npmrc` and set `config.resolver.unstable_enableSymlinks` in `metro.config.js` |
| `expo run:ios` fails in pods | `rm -rf apps/mobile/ios` and run it again; the directory is generated |

Known gotchas still to document once hit: vips on Apple Silicon, Expo dev client and Xcode beta mismatches.

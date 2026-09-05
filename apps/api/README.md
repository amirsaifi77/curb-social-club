# @cac/api

Rails 8 API-only backend for Cars and Coffee. Not generated yet. This README is the spec for the `rails new` PR.

## Generate

```sh
cd apps
rails new api --api --database=postgresql --skip-test --skip-action-mailbox --skip-action-text --skip-action-cable --skip-jbuilder
```

Then add the gems below, switch to `structure.sql` (`config.active_record.schema_format = :sql`), and install rspec.

## Planned gems

| Group | Gems |
|---|---|
| Core | `rails ~> 8.1`, `pg`, `puma`, `thruster`, `bootsnap` |
| API | `rack-cors`, `alba`, `pagy`, `pundit`, `rack-attack` |
| Geo | `activerecord-postgis-adapter ~> 11.1`, `rgeo`, `rgeo-geojson`, `geocoder` |
| Jobs and cache | `solid_queue`, `solid_cache`, `mission_control-jobs` |
| Media | `aws-sdk-s3` (R2), `image_processing`, `ruby-vips`, `blurhash` |
| Auth | `jwt` (Apple and Google id token verification) |
| Recurrence | `ice_cube` |
| Importer | `faraday`, `faraday-retry`, `nokogiri`, `robotstxt` (or `robots`), an LLM client gem |
| Notifications | `exponent-server-sdk`, `resend` |
| Docs | `rswag-api`, `rswag-specs`, `rswag-ui` (dev only) |
| Observability | `sentry-ruby`, `sentry-rails`, `lograge` |
| Dev and test | `rspec-rails`, `factory_bot_rails`, `faker`, `shoulda-matchers`, `webmock`, `vcr`, `dotenv-rails`, `annotaterb`, `bullet`, `rubocop-rails-omakase`, `rubocop-rspec`, `letter_opener` |

## Planned structure

```
apps/api/
  app/
    controllers/
      api/v1/                 # one controller per resource, ApplicationController handles auth and errors
      admin/                  # moderation views, session cookie auth for moderators
    models/
    serializers/              # Alba resources: EventSummaryResource, EventResource, ...
    policies/                 # Pundit
    services/
      auth/                   # AppleTokenVerifier, GoogleTokenVerifier, SessionIssuer
      importers/              # BaseAdapter, Registry, Fetcher, DraftEvent, adapters/*, LlmExtractor
      geo/                    # NearbyQuery, ViewportQuery
      recurrence/             # Materializer
      notifications/          # FanOut, ExpoPush, Mailer helpers
    jobs/                     # ImportJob, MaterializeOccurrencesJob, NotificationDeliveryJob, PurgeJob, ...
    mailers/
  config/
    recurring.yml             # Solid Queue schedule
    initializers/rack_attack.rb, cors.rb, sentry.rb, rswag.rb
  db/
    migrate/
    structure.sql
    seeds.rb                  # Inland Empire venues and sample recurring meets
  spec/
    requests/api/v1/          # rswag specs, generate OpenAPI
    models/, services/, jobs/, policies/
    cassettes/                # VCR for importer adapters
    swagger_helper.rb
  swagger/v1/openapi.yaml     # generated, committed
  Dockerfile                  # from rails new, add libvips
  bin/dev, bin/jobs, Procfile.dev
  package.json                # Turborepo wrapper scripts only
  turbo.json
```

## Commands

| Command | What |
|---|---|
| `pnpm --filter @cac/api build` | `bundle install && bin/rails db:prepare` |
| `pnpm --filter @cac/api dev` | `bin/dev` (Puma + Solid Queue worker) |
| `pnpm --filter @cac/api test` | rspec |
| `pnpm --filter @cac/api lint` | rubocop |
| `pnpm --filter @cac/api openapi` | regenerate `swagger/v1/openapi.yaml` |
| `bin/rails c` | console |
| `bin/rails db:seed` | seed venues and meets |

## Conventions

UUID primary keys, `structure.sql`, timestamps in UTC, Alba serializers per screen shape, Pundit policy per resource, every endpoint has an rswag request spec. See `docs/architecture.md` section 3 and `docs/data-model.md`.

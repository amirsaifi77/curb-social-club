# ADR 0002: Rails 8 API-only backend with Solid Queue and Solid Cache

Date: 2026-09-05. Status: Accepted.

## Context

The backend must serve JSON to iOS and web, run background jobs (importer, recurrence materialization, notifications, image variants), store media, and expose geo queries. The builder is one person with strong Rails familiarity and limited hours. Operational surface must stay small.

## Decision

Rails 8.1, generated with `--api`, on Ruby 3.3. Keep the Rails 8 defaults where they fit an API app:

| Default | Kept? | Note |
|---|---|---|
| Solid Queue | Yes | Postgres-backed jobs, recurring schedule in `config/recurring.yml`, no Redis. |
| Solid Cache | Yes | Postgres-backed cache for fetcher cache, JWKS, geocoding, rate limit buckets. |
| Solid Cable | No | No realtime features at launch. |
| Propshaft, Importmap, Hotwire | No | API-only, no views. Admin pages (moderation, jobs dashboard) are the one exception and use plain Rails views with minimal CSS. |
| Thruster | Yes | HTTP/2, compression, and asset caching in front of Puma inside the container. |
| Kamal | Not at launch | Render handles deploys. The generated Dockerfile stays so Kamal or Fly remain options. |
| Built-in authentication generator | No | Cookie and password oriented. See ADR 0006. |
| rubocop-rails-omakase | Yes | |

Serialization with Alba. Authorization with Pundit. Pagination with Pagy (keyset). OpenAPI via rswag. Geo via activerecord-postgis-adapter (ADR 0003). Storage via Active Storage on Cloudflare R2 (ADR 0008).

## Alternatives

| Option | Why not |
|---|---|
| Sidekiq | Excellent, but needs Redis, which is another paid service and another failure mode. Solid Queue handles thousands of jobs per minute on Postgres, well beyond launch needs. Migration path is straightforward if needed. |
| Node backend (NestJS, Hono) sharing TypeScript end to end | Tempting for type sharing, but Rails delivers Active Storage, jobs, migrations, and conventions out of the box. OpenAPI generation gives the type sharing anyway. |
| Full Rails with Hotwire for web | Web is secondary and needs React for map interactions and shared components with mobile. |
| GraphQL | Clients have a fixed set of screens; REST with fixed serializer shapes is simpler to cache and document. |

## Consequences

Positive: one database powers data, jobs, and cache. Rails conventions make Claude Code sessions predictable. Dockerfile from `rails new` is production ready.

Negative: Solid Queue puts job churn on the primary database; monitor bloat and autovacuum. Alba and rswag require discipline so that serializers and specs stay aligned; the CI staleness check enforces this. API-only mode means the moderation admin needs a little extra setup (`ActionController::Base` controllers for admin, session cookies for moderators only).

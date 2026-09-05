# ADR 0008: Render for API and Postgres, Vercel for web, Cloudflare R2 for media

Date: 2026-09-05. Status: Proposed (confirm with Amir).

## Context

The brief allows Render or Fly.io for Rails plus Postgres/PostGIS, Vercel for web, and R2 or S3 for media. Requirements: managed Postgres with the PostGIS extension, a background worker process for Solid Queue, scheduled jobs, low fixed cost, minimal operations for a solo builder, and a path to grow.

## Decision

| Layer | Choice | Detail |
|---|---|---|
| API and workers | Render | One web service (`bin/thrust bin/rails server`), one background worker (`bin/jobs`), both built from the Rails Dockerfile. Declared in `render.yaml`. Auto deploy from `main` after CI. |
| Database | Render managed Postgres 16 | `CREATE EXTENSION postgis` is supported. Daily backups. Start on the smallest paid tier; free tier databases expire. |
| Web | Vercel | React Router v7 preset, preview deploys per PR, production on `main`, edge caching for OG images. |
| Media | Cloudflare R2 | S3-compatible endpoint for Active Storage via `aws-sdk-s3`. Public bucket behind a custom domain (`media.curbsocial.club`, domain unconfirmed) with Cloudflare caching. No egress fees. |
| DNS and TLS | Cloudflare | Apex and subdomains, proxied for web and media, DNS-only for the Render API host (Render terminates TLS). |
| Errors | Sentry | Free tier. |
| Email | Resend | Free tier at launch. |
| Push | Expo Push Service | Free. |

Estimated fixed cost at launch: roughly 25 to 40 USD per month (Render web plus worker plus Postgres starter tiers), everything else on free tiers.

## Alternatives

| Option | Why not (now) |
|---|---|
| Fly.io | Very capable, cheaper at scale, multi-region. But Fly Postgres (unmanaged) requires operating Postgres yourself, and Fly Managed Postgres is newer and pricier at the low end. Fly's machine model needs more configuration for worker processes and cron. Keep as the migration target if Render costs or regional latency become a problem; the same Dockerfile deploys there. |
| Kamal on a VPS (Hetzner, DigitalOcean) | Cheapest and the Rails 8 default, but it makes Amir the DBA and the on-call. Not for a nights-and-weekends project at launch. |
| Heroku | Pricier than Render for equivalent tiers and PostGIS availability depends on plan. |
| Railway | Good developer experience; PostGIS requires a custom image. Render has the extension on managed Postgres. |
| AWS S3 instead of R2 | Egress charges on an image-heavy feed; R2 is S3-compatible so switching is a config change. |
| Supabase (Postgres plus storage) | Nice bundle, but the Rails app would use only the Postgres piece, and Solid Queue on a pooled connection needs care. |

## Consequences

Positive: zero server administration, declarative infra in `render.yaml`, backups included, and the app stays portable through its Dockerfile and 12-factor config.

Negative: Render's starter tiers are single-region (Oregon is closest to SoCal, acceptable). Render Postgres storage and connection limits on small tiers must be watched as Solid Queue polls the database. Off-platform backups to R2 are a weekly job we own. Vercel and Render are two dashboards; acceptable.

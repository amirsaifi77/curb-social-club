# API Reference (v1 draft)

Status: planning draft, 2026-09-05. The authoritative spec will be `apps/api/swagger/v1/openapi.yaml`, generated from rswag request specs. This document sets the conventions and the initial endpoint contracts so the client packages can be designed in parallel.

## Conventions

| Topic | Rule |
|---|---|
| Base URL | `https://api.carsandcoffee.app/v1` (production), `http://localhost:3000/v1` (dev) |
| Format | JSON request and response bodies. Keys are `snake_case`. |
| Timestamps | ISO 8601 in UTC (`2026-09-12T14:00:00Z`). Occurrence payloads also include `timezone` so clients render local time. |
| Coordinates | `{ "lat": 34.09, "lng": -117.43 }` objects, never arrays. |
| IDs | UUID strings. Events are addressed by `slug` on public read endpoints and by `id` on write endpoints. |
| Auth | `Authorization: Bearer <token>`. Missing or invalid token on an anonymous-allowed endpoint is treated as anonymous, not rejected. |
| Device | `X-Device-Id: <uuid>` on all requests from mobile and web. Used for anonymous personalization and push registration. |
| Pagination | Cursor based. Request `?limit=20&cursor=<opaque>`. Response `meta.next_cursor` is null on the last page. Max limit 50. |
| Errors | See envelope below. |
| Idempotency | `PUT` endpoints are idempotent by design. `POST /imports` dedupes by `(user_id, source_url)` within one hour. |
| Compression | gzip or br. |
| Caching | Public GETs send `Cache-Control: public, max-age=30, stale-while-revalidate=300` and an `ETag`. |

### Error envelope

```json
{
  "error": {
    "code": "validation_failed",
    "message": "Title can't be blank",
    "details": { "title": ["can't be blank"] }
  }
}
```

| HTTP | code |
|---|---|
| 400 | `bad_request` |
| 401 | `unauthenticated` |
| 403 | `forbidden` |
| 404 | `not_found` |
| 409 | `conflict` |
| 422 | `validation_failed` |
| 429 | `rate_limited` (with `Retry-After`) |
| 500 | `internal_error` |

### Response envelope

Single resource: `{ "data": { ... } }`. Collection: `{ "data": [ ... ], "meta": { "next_cursor": "...", "total": null } }`. `total` is only populated where cheap.

## Resources

Field lists are the planned Alba serializers. `?include=` is not supported; each endpoint returns a fixed shape sized for its screen.

### EventSummary (used in lists, map, feed)

```json
{
  "id": "uuid",
  "slug": "saturday-cars-and-coffee-fontana-a1b2c3",
  "title": "Saturday Cars and Coffee Fontana",
  "cover_url": "https://media.carsandcoffee.app/...",
  "cover_blurhash": "L6PZfSi_.AyE_3t7t7R**0o#DgR4",
  "tags": ["all"],
  "recurring": true,
  "rrule_text": "Every Saturday",
  "host": { "id": "uuid", "handle": "amir", "display_name": "Amir", "avatar_url": "..." },
  "venue": { "id": "uuid", "name": "Victoria Gardens", "city": "Rancho Cucamonga", "location": { "lat": 34.11, "lng": -117.53 } },
  "next_occurrence": { "id": "uuid", "starts_at": "...", "ends_at": "...", "timezone": "America/Los_Angeles", "going_count": 42 },
  "distance_m": 8400,
  "source": { "type": "evite", "url": "https://evite.com/..." }
}
```

### Event (detail)

EventSummary plus `description`, `rrule`, `dtstart`, `duration_minutes`, `rsvp_mode`, `capacity`, `status`, `visibility`, `venue` with full address, `upcoming_occurrences` (next 4), `viewer` (`{ "following": bool, "rsvp": "going" | null, "can_edit": bool }`, all false for anonymous), `photos_count`, `comments_count`.

### Occurrence

`id`, `event` (EventSummary), `starts_at`, `ends_at`, `timezone`, `status`, `override_note`, `going_count`, `interested_count`, `check_in_count`, `going_preview` (first 8 avatars), `viewer` (`rsvp`, `checked_in`).

### MapPin

`id` (occurrence), `event_id`, `slug`, `lat`, `lng`, `starts_at`, `title`, `going_count`. Intentionally flat and small.

### Profile

`id`, `handle`, `display_name`, `bio`, `avatar_url`, `home_label`, `is_host`, `links`, `counts` (`followers`, `following`, `events_hosted`, `vehicles`), `viewer` (`following`, `blocked`).

### Vehicle

`id`, `year`, `make`, `model`, `trim`, `nickname`, `color`, `description`, `is_primary`, `photos` (url, blurhash, width, height).

### Post

`id`, `kind`, `body`, `author` (mini profile), `occurrence` (id, slug, starts_at, title) or null, `photos`, `comments_count`, `created_at`, `viewer` (`can_delete`).

### Comment

`id`, `body`, `author`, `parent_id`, `created_at`, `viewer.can_delete`.

### Import

`id`, `status`, `source_type`, `source_url`, `error_code`, `error_message`, `draft` (DraftEvent or null), `created_at`.

### DraftEvent

```json
{
  "title": "Cars and Coffee at Victoria Gardens",
  "description": "...",
  "starts_at": "2026-09-12T14:00:00Z",
  "ends_at": "2026-09-12T17:00:00Z",
  "timezone": "America/Los_Angeles",
  "rrule": null,
  "venue_name": "Victoria Gardens",
  "address": "12505 N Mainstreet, Rancho Cucamonga, CA 91739",
  "location": { "lat": 34.11, "lng": -117.53 },
  "host_name": "IE Car Club",
  "cover_image_url": "https://...",
  "source_url": "https://www.evite.com/event/...",
  "source_type": "evite",
  "confidence": { "title": 0.95, "starts_at": 0.95, "address": 0.7, "location": 0.6, "host_name": 0.5 }
}
```

## Endpoints

### Auth

| Method | Path | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/auth/apple` | anon | `{ identity_token, authorization_code, nonce, full_name? }` | `{ token, user, is_new }` |
| POST | `/auth/google` | anon | `{ id_token }` | `{ token, user, is_new }` |
| DELETE | `/auth/session` | user | | 204 |

Apple: `full_name` is only delivered by Apple on first authorization, so the client must forward it or it is lost.

### Me

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/me` | user | User plus Profile plus notification prefs |
| PATCH | `/me` | user | `{ profile: { handle, display_name, bio, home_location, home_label, links, notification_prefs }, avatar_blob_id }` |
| DELETE | `/me` | user | Starts deletion; returns 202 |
| GET | `/me/vehicles` | user | |
| POST | `/me/vehicles` | user | |
| PATCH | `/me/vehicles/:id` | user | |
| DELETE | `/me/vehicles/:id` | user | |
| GET | `/me/rsvps` | user | Upcoming occurrences the user is going to |
| GET | `/me/events` | user | Hosted events including drafts |

### Devices

| Method | Path | Auth | Body |
|---|---|---|---|
| POST | `/devices` | anon | `{ anonymous_id, platform, push_token?, app_version, home_location? }`; upserts on `anonymous_id` |
| PATCH | `/devices/:anonymous_id` | anon | Update push token or home location |

### Events

| Method | Path | Auth | Params |
|---|---|---|---|
| GET | `/events` | anon | `near=lat,lng` and `radius_km` (default 40, max 160) or `bbox=w,s,e,n`; `from`, `to` (default now to +14 days); `tags[]`; `recurring=true`; `q`; `sort=date|distance`; cursor pagination. Returns EventSummary with `next_occurrence` inside the window. |
| GET | `/events/map` | anon | `bbox` required, `from`, `to`, `tags[]`. Returns `{ data: MapPin[], meta: { truncated } }`, cap 500. |
| GET | `/events/:slug` | anon | Event detail. 404 for drafts unless viewer is host. |
| POST | `/events` | user | `{ import_id?, title, description, venue: { id } | { name, address, location }, dtstart, duration_minutes, timezone, rrule?, rrule_until?, tags, cover_blob_id?, rsvp_mode, capacity?, visibility, source_url?, status: "draft" | "published" }` |
| PATCH | `/events/:id` | host | Same body, partial. Changing schedule fields triggers re-materialization. |
| DELETE | `/events/:id` | host | Sets `cancelled`, cancels future occurrences, notifies RSVPs. |
| GET | `/events/:id/occurrences` | anon | Upcoming, paginated. |
| GET | `/events/:slug/comments` | anon | |
| POST | `/events/:id/comments` | user | `{ body, parent_id? }` |

### Occurrences

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/occurrences/:id` | anon | |
| PATCH | `/occurrences/:id` | host | `{ starts_at?, ends_at?, status?, override_note? }` marks `overridden_at` |
| PUT | `/occurrences/:id/rsvp` | user | `{ status, vehicle_id? }` |
| DELETE | `/occurrences/:id/rsvp` | user | |
| GET | `/occurrences/:id/attendees` | anon | Going list, paginated, respects blocks |
| POST | `/occurrences/:id/check_in` | user | `{ location? }`; allowed from 1 h before start to 2 h after end |
| GET | `/occurrences/:id/posts` | anon | |

### Posts and comments

| Method | Path | Auth | Body |
|---|---|---|---|
| POST | `/posts` | user | `{ event_occurrence_id?, body?, photo_blob_ids: [], vehicle_id? }` |
| GET | `/posts/:id` | anon | |
| DELETE | `/posts/:id` | owner | |
| GET | `/posts/:id/comments` | anon | |
| POST | `/posts/:id/comments` | user | `{ body, parent_id? }` |
| DELETE | `/comments/:id` | owner or host of the parent | |

### Feed

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/feed` | anon | Sections: `upcoming_nearby` (EventSummary[]), `following` (activity items, empty for anon), `recent_photos` (Post[] near you from the last 7 days). `near` param or device home location. |

### Users and follows

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/users/:handle` | anon | Profile |
| GET | `/users/:handle/events` | anon | Published hosted events |
| GET | `/users/:handle/vehicles` | anon | |
| GET | `/users/:handle/posts` | anon | |
| PUT | `/follows` | user | `{ followable_type: "User" | "Event", followable_id }` |
| DELETE | `/follows` | user | Same body |
| PUT | `/blocks/:user_id` | user | |
| DELETE | `/blocks/:user_id` | user | |

### Imports

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/imports` | user | `{ source_url }` or `{ flyer_blob_id, ocr_text? }`. Returns 202 with Import. |
| GET | `/imports/:id` | owner | Poll. Clients poll every 2 s for up to 60 s, then show a retry. |
| POST | `/imports/:id/retry` | owner | Re-run with `force_llm: true` option. |

### Uploads

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/uploads/direct` | user | Active Storage direct upload: `{ filename, byte_size, checksum, content_type }` returns `{ signed_id, direct_upload: { url, headers } }`. Max 15 MB, jpeg/png/heic/webp. |

### Notifications

| Method | Path | Auth |
|---|---|---|
| GET | `/notifications` | user |
| PATCH | `/notifications/:id` | user (`{ read: true }`) |
| POST | `/notifications/read_all` | user |

### Venues

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/venues/search` | anon | `q`, `near`. Returns existing venues first, then provider suggestions. Cached 24 h per query. |
| GET | `/venues/:id` | anon | Venue with upcoming events |

### Reports

| Method | Path | Auth | Body |
|---|---|---|---|
| POST | `/reports` | user | `{ reportable_type, reportable_id, reason, details? }` |

### System

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | `{ status: "ok", db: true, queue_lag_s: 3 }` |
| GET | `/openapi.yaml` | Served by rswag-api |
| GET | `/.well-known/apple-app-site-association` | Served by the web app, not the API |

## Rate limits

| Scope | Limit |
|---|---|
| Anonymous, per IP | 60 requests per minute |
| Authenticated, per token | 300 requests per minute |
| `/auth/*`, per IP | 10 per minute |
| `/imports`, per user | 20 per hour |
| `/uploads/direct`, per user | 60 per hour |
| `/reports`, per user | 20 per day |

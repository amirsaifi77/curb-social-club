# API Reference (v1 draft)

Status: planning draft v0.3, 2026-09-06 (v0.2 was 2026-09-05). The authoritative spec will be `apps/api/swagger/v1/openapi.yaml`, generated from rswag request specs. This document sets the conventions and the initial endpoint contracts so the client packages can be designed in parallel. v0.3 adds the polymorphic `host` shape, clubs, sponsors, event sponsorships, claim requests, spots, Instagram posts, and the sectioned feed. Feature specs in `docs/specs/` reference these endpoints by path.

## Conventions

| Topic | Rule |
|---|---|
| Base URL | `https://api.curbsocial.club/v1` (production, domain unconfirmed), `http://localhost:3000/v1` (dev) |
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
| 410 | `gone` (hidden or deleted event; body carries `nearby: EventSummary[]`). Hidden posts, comments, and spots are 404. Dormant events are 200 with `dormant: true`. |
| 429 | `rate_limited` (with `Retry-After`) |
| 500 | `internal_error` |
| 503 | `service_unavailable` (an upstream such as oEmbed or the safety classifier is down; retry later) |

### Response envelope

Single resource: `{ "data": { ... } }`. Collection: `{ "data": [ ... ], "meta": { "next_cursor": "...", "total": null } }`. `total` is only populated where cheap.

## Resources

Field lists are the planned Alba serializers. `?include=` is not supported; each endpoint returns a fixed shape sized for its screen.

### Host (embedded wherever a host appears)

One shape for every host type (ADR 0010). Clients switch on `type` only for the link target.

```json
{
  "type": "club",
  "id": "uuid",
  "slug": "socal-aircooled",
  "name": "SoCal Aircooled",
  "avatar_url": "https://media.curbsocial.club/...",
  "verified": true,
  "kind": null
}
```

`type` is `user`, `club`, or `sponsor`. For users, `slug` is the handle. `kind` is set only for sponsors (`brand`, `vendor`, `venue`). An event that was imported and has no platform host yet still returns a `host` of type `user` pointing at the app account, plus `external_host_name` and `claimed: false` on the Event detail.

### EventSummary (used in lists, map, feed)

```json
{
  "id": "uuid",
  "slug": "saturday-cars-and-coffee-fontana-a1b2c3",
  "title": "Saturday Cars and Coffee Fontana",
  "cover_url": "https://media.curbsocial.club/...",
  "cover_blurhash": "L6PZfSi_.AyE_3t7t7R**0o#DgR4",
  "tags": ["all"],
  "recurring": true,
  "rrule_text": "Every Saturday",
  "host": { "type": "user", "id": "uuid", "slug": "amir", "name": "Amir", "avatar_url": "...", "verified": false, "kind": null },
  "venue": { "id": "uuid", "name": "Victoria Gardens", "city": "Rancho Cucamonga", "location": { "lat": 34.11, "lng": -117.53 } },
  "next_occurrence": { "id": "uuid", "starts_at": "...", "ends_at": "...", "timezone": "America/Los_Angeles", "going_count": 42, "status": "scheduled" },
  "distance_m": 8400,
  "source": { "type": "evite", "url": "https://evite.com/..." },
  "claimed": true,
  "cadence": "weekly",
  "stale": false,
  "last_confirmed_at": "2026-09-01T00:00:00Z",
  "sponsors_preview": [ { "id": "uuid", "slug": "lido-coffee", "name": "Lido Coffee", "logo_url": "...", "role": "coffee" } ]
}
```

`sponsors_preview` holds at most two entries; the full list is on the detail. `stale` is true for an unclaimed event whose `COALESCE(last_confirmed_at, published_at)` is older than 30 days (`docs/specs/events-and-occurrences.md`).

### Event (detail)

EventSummary plus `description`, `parking_note`, `rrule`, `dtstart`, `duration_minutes`, `rsvp_mode`, `capacity`, `status`, `visibility`, `dormant` (bool), `hidden` (bool, only ever true for the host or an admin; the public gets 410), `venue` with full address, `external_host_name`, `upcoming_occurrences` (next 4), `sponsorships` (`[{ sponsor: SponsorSummary, role, note, position }]`), `viewer` (`{ "following": bool, "rsvp": "going" | null, "can_edit": bool, "can_claim": bool, "claim_status": "pending" | null, "reported": bool }`, all false or null for anonymous), `photos_count`, `comments_count`, `followers_count`.

### ClubSummary and Club

ClubSummary: `id`, `slug`, `name`, `avatar_url`, `verified`, `home_label`, `members_count`, `followers_count`, `distance_m` (when a `near` param is present), `join_policy`.

Club: ClubSummary plus `description`, `banner_url`, `links`, `events_count`, `upcoming_events` (EventSummary, next 3), `members_preview` (first 8 mini profiles, `active` only), `viewer` (`{ "following": bool, "membership": { "role", "status" } | null, "can_manage": bool }`).

### SponsorSummary and Sponsor

SponsorSummary: `id`, `slug`, `name`, `kind`, `logo_url`, `verified`, `tagline`, `followers_count`, `home_label`.

Sponsor: SponsorSummary plus `description`, `banner_url`, `website`, `links`, `events_count`, `upcoming_events` (EventSummary, next 3, hosted or sponsored, each with `relation: "host" | "sponsor"`), `viewer` (`{ "following": bool }`).

### SpotSummary and Spot

SpotSummary: `id`, `slug`, `name`, `address_label`, `city`, `access`, `location`, `photos_count`, `cover` (`{ url, blurhash, width, height }` from the most recent visible photo, or null), `distance_m` when `near` is present.

Spot: SpotSummary plus `description`, `access_notes`, `region`, `created_by` (mini profile), `last_photo_at`, `viewer` (`{ "can_edit": bool, "reported": bool }`).

### SpotPin

`id`, `slug`, `lat`, `lng`, `name`, `photos_count`. Flat and small, same idea as MapPin.

### ClaimRequest

`id`, `event` (`{ id, slug, title }`), `claim_as` (Host shape), `relationship`, `evidence_url`, `status`, `review_note`, `created_at`, `reviewed_at`.

### Occurrence

`id`, `event` (EventSummary), `starts_at`, `ends_at`, `timezone`, `status`, `override_note`, `going_count`, `interested_count`, `check_in_count`, `going_preview` (first 8 avatars), `viewer` (`rsvp`, `checked_in`).

### MapPin

`id` (occurrence), `event_id`, `slug`, `lat`, `lng`, `starts_at`, `title`, `going_count`. Intentionally flat and small.

### Profile

`id`, `handle`, `display_name`, `bio`, `avatar_url`, `home_label`, `is_host`, `links` (`{ instagram, youtube, tiktok, x, threads, website }`, handles rendered as icon links by the client), `clubs` (ClubSummary[] for `active` memberships, each with `role`), `counts` (`followers`, `following`, `events_hosted`, `vehicles`, `posts`), `viewer` (`following`, `blocked`, `is_self`, `reported`).

### MiniProfile

`id`, `handle`, `display_name`, `avatar_url`. Used inside posts, comments, member previews, and going lists.

### Vehicle

`id`, `year`, `make`, `model`, `trim`, `nickname`, `color`, `description`, `is_primary`, `photos` (url, blurhash, width, height).

### Post

`id`, `kind` (`photo`, `instagram`, `text`), `body`, `author` (MiniProfile), `occurrence` (`{ id, slug, starts_at, title }`) or null, `photos` (`[{ id, url, blurhash, width, height, spot: SpotSummary | null, vehicle_id }]`, empty for `instagram` and `text`), `external_media` (`{ provider, url, author_handle, status, spot: SpotSummary | null }` for `instagram`, else null), `comments_count`, `created_at`, `viewer` (`can_delete`, `reported`).

Clients render `instagram` posts as an embed card. The API never returns an image URL for them; `GET /posts/:id/embed` returns the oEmbed payload (see Posts below).

### Comment

`id`, `body`, `author` (MiniProfile), `is_host` (the author is the host of the parent event, or a manager of the hosting club), `parent_id`, `created_at`, `viewer` (`can_delete`, `reported`).

### Import

`id`, `status`, `source_type`, `source_url`, `error_code`, `error_message`, `draft` (DraftEvent or null), `duplicate_of` (EventSummary or null, set when the source URL or a near match is already listed), `created_at`.

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
  "confidence": { "title": 0.95, "starts_at": 0.95, "address": 0.7, "location": 0.6, "host_name": 0.5 },
  "snippets": { "starts_at": "this saturday 7-10", "address": "VG by the fountain" },
  "rrule_suggestion": "FREQ=WEEKLY;BYDAY=SA",
  "venue_candidates": [ { "id": "uuid", "name": "Victoria Gardens", "distance_m": 40 } ]
}
```

`snippets` holds the source text each low or medium confidence field came from. `rrule_suggestion` is offered in the draft editor and never auto-applied. `venue_candidates` lists up to three existing venues near the geocoded point.

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
| GET | `/me` | user | User plus Profile plus notification prefs, `identities` (`[{ provider, email }]`), `unread_notifications_count` |
| PATCH | `/me` | user | `{ profile: { handle, display_name, bio, home_location, home_label, links, notification_prefs }, avatar_blob_id }` |
| DELETE | `/me` | user | Starts deletion; returns 202 `{ purge_after }` (30 days). Signing in again before then restores the account. |
| GET | `/me/vehicles` | user | |
| POST | `/me/vehicles` | user | `{ year, make, model, trim?, nickname?, color?, description?, is_primary?, photo_blob_ids?: [] }` |
| PATCH | `/me/vehicles/:id` | user | Same, partial; `photo_blob_ids` replaces the set |
| DELETE | `/me/vehicles/:id` | user | |
| GET | `/me/blocks` | user | MiniProfile[] the user has blocked |
| GET | `/me/rsvps` | user | Upcoming occurrences the user is going to; `past=true` returns the last 14 days (going or checked in), used by the post composer |
| GET | `/me/events` | user | Events where the user is the host or an owner or admin of the hosting club, including drafts |
| GET | `/me/clubs` | user | ClubSummary[] with `role` and `status` for every membership |
| GET | `/me/claims` | user | ClaimRequest[] |
| GET | `/me/following` | user | `?type=user|club|sponsor|event`; Host or EventSummary shapes |

### Devices

| Method | Path | Auth | Body |
|---|---|---|---|
| POST | `/devices` | anon | `{ anonymous_id, platform, push_token?, app_version, home_location?, timezone }`; upserts on `anonymous_id` |
| PATCH | `/devices/:anonymous_id` | anon | Update push token, home location, or timezone |

### Events

| Method | Path | Auth | Params |
|---|---|---|---|
| GET | `/events` | anon | `near=lat,lng` and `radius_km` (default 32, which is the "20 miles" in product copy; max 160) or `bbox=w,s,e,n`; `from`, `to` (default now to +14 days); `tags[]`; `recurring=true`; `q`; `host=<type>:<id>` (for host pages); `sponsor=<id>` (events the sponsor hosts or backs); `sort=date|distance`; cursor pagination. Returns EventSummary with `next_occurrence` inside the window. `q` without `near` or `bbox` searches everywhere; `q` with `near` defaults `radius_km` to 80. Dormant and hidden events are excluded. |
| GET | `/events/map` | anon | `bbox` required, `from`, `to`, `tags[]`, `recurring=true`. Returns `{ data: MapPin[], meta: { truncated } }`, cap 500, one pin per event (its next occurrence in the window). 400 `bad_request` when `bbox` is missing or wider than 5 degrees. |
| GET | `/events/:slug` | anon | Event detail. `token` query param unlocks an `unlisted` event. 404 for drafts unless the viewer can edit; 410 `gone` with `nearby` for hidden or deleted events (the host and admins still get 200 with `hidden: true`); dormant events return 200 with `dormant: true` for everyone, since the page persists while the event is out of lists (`docs/specs/events-and-occurrences.md` R-27). |
| POST | `/events` | user | `{ import_id?, title, description, parking_note?, host: { type: "user" } | { type: "club", id }, venue: { id } | { name, address, location }, cadence, dtstart, duration_minutes, timezone, rrule?, rrule_until?, tags, cover_blob_id?, cover_rights_confirmed?, rsvp_mode, capacity?, visibility, source_url?, edited_fields?: [], sponsorships?: [{ sponsor_id, role, note? }], venue_permission_confirmed: true, force?: bool, status: "draft" | "published" }`. `host.type: "club"` requires an `owner` or `admin` membership. `sponsorships` is admin-only at launch (403 `forbidden` otherwise). 409 `conflict` with `details.duplicate_of` (EventSummary) when an event at the same venue starts within 60 minutes and 200 m, unless `force: true`. `edited_fields` and `cover_rights_confirmed` are recorded on imports for quality analysis. |
| PATCH | `/events/:id` | host | Same body, partial. Changing schedule fields triggers re-materialization. "host" means the user host, or an owner or admin of the hosting club, or an admin. |
| DELETE | `/events/:id` | host | Sets `cancelled`, cancels future occurrences, notifies RSVPs. |
| POST | `/events/:id/confirm` | host | Sets `last_confirmed_at` to now. Answers the "Still happening?" prompt. |
| POST | `/events/:id/occurrences` | host | `{ starts_at, ends_at, override_note? }`. Adds a date to an `announced` series (or an extra date to any event) as an overridden occurrence the materializer leaves alone. |
| GET | `/events/:id/occurrences` | anon | Upcoming, paginated. |
| GET | `/events/:slug/posts` | anon | Visible posts across every occurrence of the event, most recent first. Same shape as `GET /occurrences/:id/posts`. |
| GET | `/events/:slug/comments` | anon | |
| POST | `/events/:id/comments` | user | `{ body, parent_id? }` |
| POST | `/events/:id/claims` | user | `{ claim_as: { type: "user" } | { type: "club", id }, relationship, evidence_url?, venue_permission_confirmed: true }`. 409 `conflict` with `details.reason` (`already_claimed`, `pending_claim`) if the event is already claimed or the user has a pending claim. Returns ClaimRequest. |

### Clubs

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/clubs` | anon | `near`, `radius_km`, `q`; ClubSummary[]. Hidden clubs are excluded. |
| GET | `/clubs/:slug` | anon | Club. 404 when hidden unless the viewer can manage it. |
| GET | `/clubs/:slug/events` | anon | EventSummary[], upcoming first, then past with `past=true`. |
| GET | `/clubs/:slug/members` | anon | MiniProfile[] with `role`, `active` only, paginated. Respects blocks. |
| GET | `/clubs/:slug/posts` | anon | Posts by members attached to the club's occurrences (Later). |
| POST | `/clubs` | user | Post-launch. `{ name, slug, description, join_policy, home_location?, home_label?, links? }`; creator becomes `owner`. 403 until enabled. |
| PATCH | `/clubs/:id` | manager | Post-launch. Owner or admin. |
| PUT | `/clubs/:id/membership` | user | Post-launch. Join an `open` club (`active`) or redeem `{ invite_code }` for an `invite_only` club. 403 for invite-only without a valid code. |
| DELETE | `/clubs/:id/membership` | member | Post-launch. Leave. Owners must transfer ownership first (409). |
| POST | `/clubs/:id/invites` | manager | Post-launch. `{ handle }` creates an `invited` membership and a `club_invite` notification. |
| POST | `/clubs/:id/invite_code` | manager | Post-launch. Rotates `invite_code`; returns the share URL. |
| PATCH | `/clubs/:id/members/:user_id` | manager | Post-launch. `{ role }` or `{ status: "active" }` to approve a request. Only the owner can promote to `admin` or transfer `owner`. |
| DELETE | `/clubs/:id/members/:user_id` | manager | Post-launch. Remove. |

"manager" is an `owner` or `admin` membership, or a platform admin. At launch, clubs are created and edited only through the admin UI (`docs/specs/admin.md`); the write endpoints above exist in the spec so the client contract is stable, and return 403 with code `not_enabled` until Phase 7.

### Sponsors

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/sponsors` | anon | `near`, `radius_km`, `kind`, `q`; SponsorSummary[]. Hidden sponsors excluded. |
| GET | `/sponsors/:slug` | anon | Sponsor. |
| GET | `/sponsors/:slug/events` | anon | EventSummary[] hosted or sponsored, each with `relation`. Equivalent to `GET /events?sponsor=<id>`. |
| PATCH | `/sponsors/:id` | sponsor manager | Post-launch. Returns 403 `not_enabled` until the `sponsors_self_service` flag is on. |

No other user-facing write endpoints. Sponsors and event sponsorships are managed in the admin UI; `sponsorships` on event writes is admin-only (403 `forbidden`). A `sponsor_memberships` model mirroring `club_memberships` is the planned shape for self-service after launch.

### Spots

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/spots` | anon | `near` and `radius_km` or `bbox`; `q`; `sort=recent|nearest|photos`; SpotSummary[]. |
| GET | `/spots/map` | anon | `bbox` required. `{ data: SpotPin[], meta: { truncated } }`, cap 500. Used as the Spots layer on the Map. |
| GET | `/spots/:slug/photos` | anon | Paginated `[{ photo | external_media, post: { id, author, created_at } }]`, most recent first. |
| GET | `/spots/:slug` | anon | Spot. A merged spot's old slug returns 404 with `details.merged_into_slug`. |
| GET | `/spots/suggest` | anon | `location` required (400 `bad_request` without it). Existing spots within 150 m, nearest first, so the client offers them before creating a new spot. |
| POST | `/spots` | user | `{ name, description?, location, address_label?, access, access_notes?, force?: bool }`. 409 `conflict` with `details.spot` (SpotSummary) and `details.distance_m` when a spot exists within 25 m and `force` is not true. |
| PATCH | `/spots/:id` | creator or admin | Partial. |

### Occurrences

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/occurrences/:id` | anon | |
| PATCH | `/occurrences/:id` | host | `{ starts_at?, ends_at?, status?, override_note? }` marks `overridden_at` |
| PUT | `/occurrences/:id/rsvp` | user | `{ status, vehicle_id? }`. 409 `occurrence_cancelled` when the occurrence is cancelled. |
| DELETE | `/occurrences/:id/rsvp` | user | |
| GET | `/occurrences/:id/attendees` | anon | Going list, paginated, respects blocks. Rows are `{ user: MiniProfile, status, vehicle: { year, make, model, nickname } | null, checked_in: bool }`. |
| POST | `/occurrences/:id/check_in` | user | `{ location? }`; allowed from 1 h before start to 2 h after end |
| GET | `/occurrences/:id/posts` | anon | |

### Posts and comments

| Method | Path | Auth | Body |
|---|---|---|---|
| POST | `/posts` | user | Photo post: `{ kind: "photo", event_occurrence_id?, body?, photos: [{ blob_id, spot_id?, vehicle_id? }] }` (1 to 10). Instagram post: `{ kind: "instagram", url, event_occurrence_id?, spot_id?, body? }`; the API validates the URL is an Instagram post URL, runs the oEmbed check synchronously (2 s timeout, else `checked_at` null and a background recheck), and rejects private or unavailable posts with 422 `external_media_unavailable`. Text post: `kind: "text"` is reserved in the data model and rejected with 422 at launch. |
| GET | `/posts/:id` | anon | |
| GET | `/posts/:id/embed` | anon | Instagram posts only. `{ html, width, height, author_name, provider_url, checked_at }` from Instagram oEmbed, served from Solid Cache (24 h). 404 for other kinds; 410 when `status` is `unavailable` or `private`. |
| PATCH | `/posts/:id` | owner | `{ body?, event_occurrence_id?, photos?: [{ id, spot_id }] , spot_id? }` to attach or change the spot after posting. |
| DELETE | `/posts/:id` | owner | |
| GET | `/posts/:id/comments` | anon | |
| POST | `/posts/:id/comments` | user | `{ body, parent_id? }` |
| DELETE | `/comments/:id` | owner or host of the parent | |

### Feed

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/feed` | anon | `near` param or device home location. Returns `{ data: { sections: FeedSection[] }, meta: { generated_at } }`. Each FeedSection is `{ kind, title, items, more: { path, params } | null }`. Section kinds and item shapes, in display order: `this_weekend` (EventSummary), `following` (mixed `{ type: "event" | "post", item }`, omitted for anonymous), `recent_photos` (Post, `photo` and `instagram` kinds, last 7 days within radius), `clubs_nearby` (ClubSummary, up to 6), `sponsors_nearby` (SponsorSummary with an upcoming hosted or sponsored event within radius, up to 4, organic and unpaid at launch), `spots_nearby` (SpotSummary, up to 6, Phase 4), `next_week` and `later` (EventSummary). Windows are computed in the venue's timezone: `this_weekend` is now through the coming Sunday 23:59, `next_week` is the following Monday through Sunday, `later` is the rest of the materialized horizon. Empty sections are omitted. Ranking inside a section is by time or distance; there is no cross-section ranking at launch. |

### Users and follows

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/users/:handle` | anon | Profile |
| GET | `/users/:handle/events` | anon | Published hosted events |
| GET | `/users/:handle/vehicles` | anon | |
| GET | `/users/:handle/posts` | anon | Photo, Instagram, and text posts, most recent first |
| GET | `/users/:handle/clubs` | anon | ClubSummary[] for `active` memberships |
| GET | `/users/:handle/rsvps` | anon | Upcoming occurrences the user is going to, respects blocks and (Later) profile visibility |
| PUT | `/follows` | user | `{ followable_type: "User" | "Club" | "Sponsor" | "Event", followable_id }`. Idempotent. Returns `{ following: true, followers_count }`. |
| DELETE | `/follows` | user | Same body. Returns `{ following: false, followers_count }`. |
| PUT | `/blocks/:user_id` | user | |
| DELETE | `/blocks/:user_id` | user | |

### Imports

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/imports` | user | `{ source_url }`, `{ source_text, source_url? }` (pasted or shared text, the only input for Evite and Meta sources), or `{ flyer_blob_id, ocr_text? }`. Returns 202 with Import. |
| GET | `/imports/:id` | owner | Poll. Clients poll every 2 s for up to 60 s, then show a retry. |
| POST | `/imports/:id/retry` | owner | Re-run with `force_llm: true` or with new `source_text`. |

### Uploads

| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/uploads/direct` | user | Active Storage direct upload: `{ filename, byte_size, checksum, content_type }` returns `{ signed_id, direct_upload: { url, headers } }`. Max 15 MB, jpeg/png/heic/webp. |

### Notifications

| Method | Path | Auth |
|---|---|---|
| GET | `/notifications` | user; `meta.unread_count` on every page |
| PATCH | `/notifications/:id` | user (`{ read: true }`) |
| POST | `/notifications/read_all` | user |
| POST | `/notifications/unsubscribe` | anon; `{ token }` from a digest email link, turns off `weekly_digest` email for that user. The web page `/unsubscribe/:token` calls it. |

### Venues

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/venues/search` | anon | `q`, `near`. Returns existing venues first, then provider suggestions. Cached 24 h per query. |
| GET | `/venues/:id` | anon | Venue with upcoming events |

### Reports

| Method | Path | Auth | Body |
|---|---|---|---|
| POST | `/reports` | anon | `{ reportable_type, reportable_id, reason, details? }`. Anonymous reports record `device_id` from `X-Device-Id`. |

### System

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | `{ status: "ok", db: true, queue_lag_s: 3 }` |
| GET | `/sitemap` | `{ events: [{ slug, updated_at }], clubs: [...], sponsors: [...], spots: [...] }` for public, non-hidden, non-dormant rows. Cached 1 h. The web app builds `sitemap.xml` from it. |
| GET | `/openapi.yaml` | Served by rswag-api |
| GET | `/.well-known/apple-app-site-association` | Served by the web app, not the API |

### Admin (not part of v1)

The admin UI is server-rendered Rails under `/admin` on the API host, with cookie sessions for users whose `role` is `admin` or `moderator`. It is not in the OpenAPI spec and has no JSON contract. See `docs/specs/admin.md` for its screens: moderation queue, claim review, and CRUD for venues, events, occurrences, clubs, memberships, sponsors, sponsorships, and spots, plus CSV seed import.

## Rate limits

| Scope | Limit |
|---|---|
| Anonymous, per IP | 60 requests per minute |
| Authenticated, per token | 300 requests per minute |
| `/auth/*`, per IP | 10 per minute |
| `/imports`, per user | 20 per hour |
| `/uploads/direct`, per user | 60 per hour |
| `/reports`, per user | 20 per day (anonymous: 5 per device and 20 per IP per day) |
| `POST /posts` with `kind: "instagram"`, per user | 30 per day |
| Comments, per user | 60 per hour |
| `POST /spots`, per user | 10 per day |
| `POST /events/:id/claims`, per user | 5 per day |
| `/admin/session`, per IP | 10 per minute |
| `/admin/*`, per IP | 300 per minute |
| `/admin/seeds` uploads, per IP | 10 per hour |

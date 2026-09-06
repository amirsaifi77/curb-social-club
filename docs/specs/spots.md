# Spec: Spots

Status: draft. Phase: 4. Last updated: 2026-09-06.
Depends on: photos-and-posts.md (composer S17, `photos.spot_id`, `external_media.spot_id`), discovery.md (Map S03, feed sections, pin conventions), moderation-and-safety.md (reports, auto-hide), admin.md (A11), web.md (OG cards, sitemap). Related decisions: ADR 0011 (spot on external media), gaps item 11.

## Summary

A spot is a place where car photos are taken: a backdrop, a stretch of road, a lot with good light at 7 am. It is not a venue; a venue is where a meet happens, and both can sit on the same coordinates. Spots are first-class so a photo can say where it was shot, a browser can find the spot and its photos, the Map can show them as a layer, and the web can index them. Tagging is opt-in per photo and never comes from EXIF. The app lists spots; it does not grant access, and the copy says so.

## User stories

| Id | Story |
|---|---|
| US-1 | As a member posting photos, I want to tag where a photo was shot so that other people can find the spot. |
| US-2 | As a browser, I want to open a spot and see its photos, access notes, and directions so that I know whether and when to go. |
| US-3 | As a browser, I want to turn on a spots layer on the Map so that I can see where people shoot near me. |
| US-4 | As a browser, I want the feed to show spots near me with recent photos so that I discover them without searching. |
| US-5 | As a member, I want to create a spot when none exists nearby, and be shown the existing one when it does, so that the map does not fill with duplicates. |
| US-6 | As a member or property owner, I want to report a spot on property that does not allow it so that it can be taken down. |
| US-7 | As an admin, I want to merge duplicate spots and hide bad ones so that the directory stays clean. |
| US-8 | As a browser on the web, I want a spot directory and shareable spot pages so that a spot can be sent in a message and found on Google. |

## Scope

In this phase: `spots` table, `photos.spot_id`, `external_media.spot_id`; the Spot picker (S18) from the post composer; suggest and duplicate rules with the geo constants in one place; the Spot page (S15, W11); the Spots layer on the Map (S03) with sheet cards and a per-device toggle; the spot directory (W10) and `/og/spots/:slug.png`; the `spots_nearby` feed section; access treatment on cards and pages; reporting with `unauthorized_location`; admin merge and hide (A11); counter caches; `Place` JSON-LD.

Not in this phase: creating a spot from the Map or the web (Phase 7); following a spot, comments on a spot, spot check-in (never planned); editing another user's spot outside admin; the report sheet and auto-hide mechanics (moderation-and-safety.md); the composer itself (photos-and-posts.md); the Map chrome and pin tokens (discovery.md).

## Requirements

**Data**

- R-1 A spot MUST have a `name` of 1 to 80 characters, a `description` of at most 500, `access` in `public`, `permit`, `private_permission`, `unknown`, `access_notes` of at most 300, a required `location`, a `status` in `visible`, `hidden`, `removed`, and a unique `slug` of `<kebab-name>-<6 char suffix>`, per `docs/data-model.md`. (US-5)
- R-2 `Spot::SUGGEST_RADIUS_M = 150` and `Spot::DUPLICATE_RADIUS_M = 25` MUST be the only definitions of those thresholds; controllers, jobs, and specs MUST reference the constants. (US-5)
- R-3 Every distance query on spots MUST use `ST_DWithin` on the `geography` `location` column with the `GIST (location)` index and order by `ST_Distance`; `GET /spots/map` MUST use the same `ST_Intersects` envelope query as `GET /events/map`; no distance math in Ruby. (US-3, US-5)
- R-4 Creating a spot within `DUPLICATE_RADIUS_M` of a `visible` spot MUST fail unless `force: true` is passed. (US-5)
- R-5 `spots.photos_count` MUST count `photos` plus `external_media` rows tagged with the spot whose post is `visible`, `last_photo_at` MUST be the newest `created_at` among them, both maintained by callbacks on tag, untag, and post status change, and reconciled nightly by `SpotCountersJob`. (US-2, US-4)
- R-6 A `hidden` or `removed` spot MUST return 404 on public endpoints and MUST be absent from map, suggest, feed, directory, and search; tagged photos keep `spot_id` but the Post shape MUST return `spot: null` for them. (US-7)
- R-7 `Spot#merge_into!(target)` MUST, in one transaction, move `photos.spot_id`, `external_media.spot_id`, and open `reports` to the target, set the source to `removed` with `merged_into_id`, and recount the target. (US-7)
- R-8 `GeocodeSpotJob` MUST fill `city` and `region` after create through the same provider as `GET /venues/search`, and `address_label` MUST be what the creator typed or null. (US-2)
- R-9 A spot MUST be reportable with `reportable_type: Spot`, and three open reports MUST hide it (moderation-and-safety.md). (US-6)

**API**

- R-10 `GET /spots` MUST work without a token, MUST return `visible` spots as SpotSummary, MUST support `near` with `radius_km`, `bbox`, `q` (trigram on `name`), and `sort` in `recent` (`last_photo_at` desc, nulls last), `nearest` (requires `near`), `photos` (`photos_count` desc), and MUST set `cover` from the newest visible uploaded photo, never from external media. (US-4, US-8)
- R-11 `GET /spots/map` MUST require `bbox`, MUST return `{ data: SpotPin[], meta: { truncated } }` capped at 500 visible spots, and MUST return 400 without `bbox`. (US-3)
- R-12 `GET /spots/:slug` MUST return the Spot shape with `viewer.can_edit` true only for the creator or an admin, and MUST return 404 with `details.merged_into_slug` for a merged source. (US-2, US-7)
- R-13 `GET /spots/:slug/photos` MUST return `[{ photo | external_media, post: { id, author, created_at } }]` newest first, cursor paginated, from `visible` posts only, excluding authors blocked by or blocking the viewer. (US-2)
- R-14 `GET /spots/suggest` MUST work without a token (it reads only visible spots), MUST return 400 without `location`, and MUST return up to 10 `visible` spots within `SUGGEST_RADIUS_M` nearest first, each with `distance_m`. (US-5)
- R-15 `POST /spots` MUST validate per R-1, MUST return 409 `conflict` with `details.spot` (SpotSummary) and `details.distance_m` when R-4 applies, MUST create with `force: true`, MUST set `created_by_id` to the caller, MUST return 201 with the Spot shape, and MUST be limited to 10 per user per day. (US-5)
- R-16 `PATCH /spots/:id` MUST let the creator change `name`, `description`, `access`, `access_notes`, and `address_label`, MUST let only an admin change `location` and `status`, and MUST return 403 otherwise. (US-5, US-7)
- R-17 `GET /feed` MUST include a `spots_nearby` section of up to 6 `visible` spots within the browse radius with `photos_count > 0`, ordered by `last_photo_at` desc, with `more: { path: "/spots", params: { near, sort: "recent" } }`, omitted when empty. (US-4)
- R-18 The SpotSummary `access` value MUST be present on every card payload so clients can render the access line without a detail fetch. (US-2)
- R-19 Search (S05) SHOULD show a "Spots" group from `GET /spots?q=` under clubs; discovery.md owns the layout. (US-8)

**Mobile**

- R-20 S18 MUST open from S17 for one photo (or for the Instagram post), MUST start with no location, and MUST call `GET /spots/suggest` only after the user taps "Use my location" or drops a pin; it MUST never read EXIF (the picker is invoked with `exif: false`, and EXIF is stripped server-side regardless). (US-1)
- R-21 "Use my location" MUST make a one-shot precise when-in-use request and, when denied, MUST show the denied copy and leave the pin path; "Drop a pin" MUST show a map centered on the post's venue when it has an occurrence, else on the home area, with a fixed center pin and "Use this point". (US-1)
- R-22 The suggestions list MUST show name, address label, distance, photo count, and the access line for each result, nearest first, and MUST always end with "Create a spot here". (US-5)
- R-23 The create form MUST have name, description, an access control defaulting to `unknown`, access notes, the liability line above the CTA, and a Create CTA per `docs/components/primary-cta.md`; on 409 it MUST show the existing spot card with "Use this spot" and "Create anyway" (which resends with `force: true`), and on 429 the rate limited copy. (US-5)
- R-24 Tagging MUST be per photo; the first tag in a post MUST show "Apply to all photos in this post" switched on; each photo MUST show a removable spot chip; after posting, the author MUST be able to change a spot from the S16 overflow, which opens S18 and calls `PATCH /posts/:id`. (US-1)
- R-25 S15 MUST show name, address label, access badge and notes, Directions (Apple Maps at the coordinate with the spot name), the photo grid from `GET /spots/:slug/photos` with photos and Instagram cards mixed, "Added by", "Last photo", Share (web URL), and an overflow with Report. (US-2, US-6)
- R-26 Cards and pages MUST render the access line as one caption in `textSecondary` with no icon or accent: the permit line for `permit`, the private line for `private_permission`, "Check access before you go" for `unknown`, and nothing for `public`. (US-2)
- R-27 S03 MUST offer a "Spots" chip among the filter chips; when on it MUST fetch `GET /spots/map` with the current bbox alongside events and render spot pins as 20 pt circles (event pins are 28 pt) filled `surfaceRaised` with a `textSecondary` ring and `camera` glyph, clustered only when 8 or more overlap (supercluster `minPoints: 8`), per discovery.md. (US-3)
- R-28 When the layer is on, the Map sheet MUST show a "Spots in view" group of SpotSummary cards under the events; tapping a spot pin MUST highlight its card, tapping a card MUST open S15, and "search this area" MUST refetch both layers. (US-3)
- R-29 The layer toggle MUST persist per device in local storage (`map.layers.spots`), default off, restored on launch, and MUST NOT sync to the account. (US-3)
- R-30 S15 MUST render loading, error, offline (cached), no photos yet, access warning, and no longer listed states with the copy below. (US-2)

**Web**

- R-31 W11 MUST server-render the same content as S15 with a JSON-LD `Place` (`name`, `description`, `geo` as `GeoCoordinates`, `address` from `city` and `region`), `og:image` set to `/og/spots/:slug.png`, a 404 for hidden spots, and a 301 to the target for merged spots. (US-8)
- R-32 W10 MUST list `visible` spots with the access line on each card, nearest first when a region is known and else by `last_photo_at`, and MUST be in the sitemap. (US-8)
- R-33 `/og/spots/:slug.png` MUST render a 1200 by 630 card from the newest uploaded photo's `lg` variant or the flat brand placeholder, never an Instagram image, cached at the edge for 1 h. (US-8)

**Admin and jobs**

- R-34 A11 MUST list spots with status and open report counts, edit every field including `location`, hide, restore, remove, and merge into a target chosen by name search; hide, restore, and remove MUST write `moderation_actions`. (US-7)
- R-35 `SpotCountersJob` MUST run nightly and correct any `photos_count` or `last_photo_at` drift; `GeocodeSpotJob` MUST retry three times and leave `city` null on final failure. (US-2)
- R-36 The terms (W16) MUST include the spot clause: listing does not grant access, and members must respect property and posted rules; the same line MUST appear on the S18 create form and in the S15 footer for `permit`, `private_permission`, and `unknown`. (US-6)

## Data

`spots` (all columns, including `merged_into_id`), `photos.spot_id`, `external_media.spot_id`, `reports` with `reportable_type: Spot` and reason `unauthorized_location`, `moderation_actions` with `target_type: Spot`. Indexes per the data model: `GIST (location)`, `GIN (name gin_trgm_ops)`, `BTREE (status, last_photo_at DESC)`, and `photos (spot_id, created_at DESC) WHERE spot_id IS NOT NULL`. Migration in the Phase 4 spots slice adds `merged_into_id uuid FK spots, nullable`.

## API

Read: `GET /spots`, `GET /spots/map`, `GET /spots/:slug`, `GET /spots/:slug/photos`, `GET /spots/suggest`, `GET /feed` (`spots_nearby`).

Write: `POST /spots`, `PATCH /spots/:id`, `PATCH /posts/:id` with `photos[].spot_id` or `spot_id` (photos-and-posts.md), `POST /reports` with `reportable_type: Spot`.

Deltas: 409 on `POST /spots` carries `details.spot` and `details.distance_m`; 404 on a merged slug carries `details.merged_into_slug`; `GET /spots/suggest` returns 400 `bad_request` without `location`.

## Screens and states

| Screen id | Screen | Route (mobile / web) | Primary actions | States |
|---|---|---|---|---|
| S18 | Spot picker | `spots/pick` (modal) / none | Use my location, Drop a pin, pick a suggestion, Create a spot here, Create | no location yet, location denied, loading suggestions, nearby suggestions, no suggestions, create form, validation, duplicate warning, rate limited, offline |
| S15 | Spot page | `spots/[slug]` / `/spots/:slug` | Directions, open a post, Share, Report | loading, error, offline, no photos yet, access warning, no longer listed |
| S03 | Map, Spots layer | `(tabs)/map` / `/map` | Toggle Spots, tap a pin, open a card | layer off, layer on, no spots in view, truncated |
| S02 | Home, Spots near you | `(tabs)/index` / `/` | Open a spot | omitted when empty |
| S16 | Post detail, Change spot | `posts/[id]` / none | Change spot (author) | opens S18 |
| W10 | Spot directory | none / `/spots` | Open a spot | empty |
| W11 | Spot page | none / `/spots/:slug` | Directions, Open in app | no photos yet, 404, 301 merged |
| A11 | Spots CRUD and merge | `/admin/spots` | Edit, hide, restore, remove, merge | validation, merge confirmation |

## Copy

| Where | String |
|---|---|
| S18 title | Where was this taken? |
| S18 use location | Use my location |
| S18 drop pin | Drop a pin |
| S18 location denied | Location is off for curb. Drop a pin instead. |
| S18 pin CTA | Use this point |
| S18 suggestions header | Spots nearby |
| S18 suggestions empty | No spots nearby yet. |
| S18 create | Create a spot here |
| S18 form title | New spot |
| S18 name placeholder | Name, like "Back lot, Crystal Cove" |
| S18 description placeholder | What makes it good. Light, backdrop, when it's empty. |
| S18 access options | Public, Permit or fee, Private, permission needed, Not sure |
| S18 access notes placeholder | Anything to know. "Empty before 8 am. Don't block the loading dock." |
| S18 liability line | Listing a spot doesn't grant access. Respect the property and any posted rules. |
| S18 create CTA | Create spot |
| S18 name required | Give the spot a name. |
| S18 duplicate | There's already a spot here. |
| S18 use existing | Use this spot |
| S18 create anyway | Create anyway |
| S18 rate limited | You've added a lot of spots today. Try again tomorrow. |
| S18 offline | You're offline. Spots need a connection. |
| S17 apply to all | Apply to all photos in this post |
| S16 overflow | Change spot |
| Access badge | Public, Permit, Private, Unknown |
| Access line, permit | A permit or fee applies here. Check before you go. |
| Access line, private | Private property. Get permission before you shoot. |
| Access line, unknown | Check access before you go. |
| S15 added by | Added by @handle |
| S15 last photo | Last photo Sep 5 |
| S15 photos empty | No photos here yet. Tag this spot on your next post. |
| S15 directions | Directions |
| S15 share | Share |
| S15 footer | curb lists spots. It doesn't grant access. Respect the property and any posted rules. |
| S15 no longer listed | This spot is no longer listed. |
| S03 chip | Spots |
| S03 sheet group | Spots in view |
| S03 sheet empty, layer on | No spots in view. Zoom out or turn the layer off. |
| Feed section title | Spots near you |
| Search group title | Spots |
| W10 title | Photo spots in Southern California |
| W10 empty | No spots listed yet. |
| W11 open in app | Open in curb to tag a photo here |
| S33 reason, spot | On property without permission |

## Acceptance criteria

| Id | Given | When | Then | Proves |
|---|---|---|---|---|
| AC-1 | Visible spots at 40 m, 120 m, and 200 m from a point, and a hidden spot at 10 m | `GET /spots/suggest?location=` without a token | Two results ordered 40 m then 120 m, each with `distance_m`; the hidden spot is absent; without `location` 400; without a token 401 | R-3, R-6, R-14 |
| AC-2 | A visible spot 10 m from the requested point | `POST /spots` without `force`, then with `force: true`, then at a point 30 m away without `force` | 409 with `details.spot.slug` and `details.distance_m` near 10; then 201; then 201 | R-4, R-15 |
| AC-3 | The model | Inspect `Spot::SUGGEST_RADIUS_M`, `Spot::DUPLICATE_RADIUS_M`, and `Spot.within(origin, m).to_sql` | 150, 25, and SQL containing `ST_DWithin`; a grep for `150` and `25` under `app/` finds only the constants | R-2, R-3 |
| AC-4 | A spot tagged only by one visible Instagram post | `GET /spots/:slug`, `GET /spots/:slug/photos`, `GET /feed?near=` within radius, `curl /spots/:slug` on web | `photos_count` 1, `last_photo_at` set, `cover: null`; one `external_media` item; the spot in `spots_nearby`; W11 `og:image` is `/og/spots/:slug.png` and the card renders the placeholder | R-5, R-10, R-13, R-17, R-33 |
| AC-5 | A spot with two tagged photos on one post | The post is hidden, then restored, then `photos_count` is set to 9 by hand and `SpotCountersJob` runs | 0, then 2, then 2 | R-5, R-35 |
| AC-6 | A spot with tagged photos, then hidden by admin | `GET /spots/:slug`, `GET /spots/map` over it, `GET /spots/suggest` beside it, `GET /posts/:id` for a tagged post | 404, absent, absent, and `photos[0].spot` is null | R-6 |
| AC-7 | Spots A (3 photos) and B (1 photo, one open report) | `A.merge_into!(B)` then `GET /spots/:a_slug` | B has `photos_count` 4 and the report; A is `removed` with `merged_into_id` B; 404 with `details.merged_into_slug: b` | R-7, R-12 |
| AC-8 | A spot created by user U | `PATCH /spots/:id` by U with `name`, by U with `location`, by a stranger with `name`, by an admin with `location` | 200, 403, 403, 200 | R-16 |
| AC-9 | Eight visible spots within radius, two with `photos_count` 0, one hidden | `GET /feed?near=` | `spots_nearby` has six items ordered by `last_photo_at` desc with `more.path` `/spots`; with all counts 0 the section is omitted | R-17 |
| AC-10 | 501 visible spots inside a bbox | `GET /spots/map?bbox=`, then without `bbox` | 500 SpotPins with `truncated: true`; then 400 | R-11 |
| AC-11 | A user who created 10 spots today | `POST /spots` | 429 `rate_limited` with `Retry-After` | R-15 |
| AC-12 | Device, S03 with the Spots layer off | Tap the Spots chip, pan, kill the app, relaunch | Spot pins appear smaller than event pins with the camera glyph, the sheet gains "Spots in view", and after relaunch the layer is still on | R-27 to R-29 |
| AC-13 | Device, S17 with three photos, one with GPS EXIF | Tap Add a spot on the first photo | S18 opens with no location and no suggestions until "Use my location" is tapped; picking a suggestion with apply-to-all on puts the chip on all three photos | R-20, R-22, R-24 |
| AC-14 | Device, S18, a pin dropped on an existing spot | Fill the form and tap Create spot | The duplicate card appears; "Use this spot" selects the existing spot and returns to S17 | R-23 |
| AC-15 | Device, seeded spots with `permit`, `private_permission`, `unknown`, `public` | Open each S15 and view each in the sheet | The permit, private, and unknown lines appear on both surfaces; the public spot shows no line; the S15 footer appears on the first three only | R-26, R-30, R-36 |
| AC-16 | W11 fetched with curl | The HTML is inspected | JSON-LD `Place` with `geo.latitude` and `geo.longitude`, `og:image` under `/og/spots/`, the access line text present | R-31 |
| AC-17 | A visible spot | Three users report it with `unauthorized_location` | The spot is `hidden` (moderation-and-safety.md AC for auto-hide) and shows in A11 with a report count of 3 | R-9, R-34 |

## Verification

| Check | How |
|---|---|
| API | `pnpm --filter @curb/api test spec/requests/api/v1/spots_spec.rb spec/models/spot_spec.rb spec/jobs/spot_counters_job_spec.rb spec/jobs/geocode_spot_job_spec.rb` with real geography fixtures (points offset by known meters) |
| Feed | `spec/requests/api/v1/feed_spec.rb` covers AC-9 |
| Constants | `spec/models/spot_spec.rb` asserts AC-3 including the `to_sql` check |
| Mobile | Manual on a physical iPhone in Marine Layer light and Harbor dark: AC-12 to AC-15. Maestro flow `spot_tag.yaml` once flows exist. |
| Web | `pnpm --filter @curb/web test` Playwright on `/spots` and `/spots/:slug` asserting AC-16 and the OG route returning `image/png` |
| Admin | `spec/requests/admin/spots_spec.rb` covers merge, hide, restore, and the audit row |
| Design | Figma page "iOS Screens", frames "Spot picker", "Spot page", "Map with spots layer" (Phase 4 design pass); pin sizes checked against discovery.md |

## Risks and open questions

- Gaps item 11: a spot on private property is the same exposure as a meet on a contested lot. Default: the terms clause (R-36), the access field with `unknown` as the default, the `unauthorized_location` report reason, and admin hide; the one-hour legal review before launch covers the wording.
- Adopted 2026-09-06 into docs/data-model.md: add `spots.merged_into_id uuid FK spots, nullable` so merged slugs resolve and the audit trail survives.
- Adopted 2026-09-06 into docs/data-model.md: cap `spots.access_notes` at 300 characters (currently unbounded) so the card layout is predictable.
- Adopted 2026-09-06 into docs/api.md: document `details.spot` and `details.distance_m` on the 409, `details.merged_into_slug` on the merged 404, and the 400 for a missing `location` on `GET /spots/suggest`.
- `GET /spots/map` takes `bbox` (api.md) while suggest and `near` take a point; this spec keeps both and uses `ST_DWithin` for every point query and the envelope query for the bbox, matching `docs/architecture.md` 3.4.
- Reverse geocoding for `city` and `region` depends on the venue search provider (gaps item 21 for maps). Default: same provider, cached, null on failure; W10 groups nulls under "Elsewhere".
- Pin color: the brand guide defines six event pin colors and no spot pin. Default: the inverted fill in R-27 until discovery.md names a token; do not add a token here.
- Spots with only Instagram photos have no cover anywhere (feed card, sheet card, OG). Default: the flat placeholder with the camera glyph; never an Instagram image.

## Session breakdown

| Slice | Deliverable | Covers | Must pass |
|---|---|---|---|
| 1 | `spots` model, constants, geo scopes, slug, validations, counters, `merge_into!`, `SpotCountersJob`, `GeocodeSpotJob`, `merged_into_id` migration, factories | R-1 to R-9, R-35 | AC-3, AC-5, AC-7 (model) |
| 2 | Read and write endpoints, suggest, duplicate 409, rate limit, rswag specs, `spots_nearby` section, Spot report type | R-10 to R-19 | AC-1, AC-2, AC-4 (API), AC-6, AC-8 to AC-11 |
| 3 | S18 picker (location, pin, suggestions, create form, duplicate card) and tagging in S17 with apply-to-all, Change spot from S16 | R-20 to R-24 | AC-13, AC-14 |
| 4 | S15 page, access treatment, Spots layer on S03 with pins, sheet group, persisted toggle, feed section card | R-25 to R-30 | AC-12, AC-15 |
| 5 | W10, W11 with JSON-LD and 301, `/og/spots/:slug.png`, sitemap entries | R-31 to R-33 | AC-4 (web), AC-16 |
| 6 | A11 list, edit, hide, restore, remove, merge with audit rows; terms clause with the moderation spec's W16 slice | R-34, R-36 | AC-7 (admin), AC-17 |

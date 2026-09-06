# Spec: Events and occurrences

Status: draft. Phase: 1. Last updated: 2026-09-06.
Depends on: auth-and-accounts.md (app account, roles), admin.md (A04, A07 consume this spec's model and CSV format). Related decisions: ADR 0003, ADR 0010, `docs/architecture.md` sections 3.4 and 3.5, gaps items 4, 5, 6, 7, 8, 9.

## Summary

An event is a meet with a host, a venue, and a schedule; an occurrence is one date of it, materialized ahead of time so "near me this weekend" is one indexed PostGIS query. The host is a user, a club, or a sponsor behind one shape. Seeded meets carry a source link and a verification date, are confirmed or decay on a fixed clock, and hide themselves before they become wrong. This spec owns the models, the materializer, the geo queries, and the read endpoints every discovery screen consumes; it has no screen of its own.

## User stories

| Id | Story |
|---|---|
| US-1 | As a browser, I want every meet within 20 miles this weekend in one list so that I can pick one in under a minute. |
| US-2 | As a browser, I want the map to show pins for the visible area and tell me when there are too many so that I can zoom in rather than miss meets. |
| US-3 | As a browser, I want a weekly meet to show its next date and its cadence ("Every Saturday, 7:30 to 10 am") so that I know it repeats without reading the description. |
| US-4 | As a browser, I want a meet whose dates are only announced on Instagram to exist without a fake schedule so that I can follow it and not be misled. |
| US-5 | As a browser, I want to see when a seeded meet was last confirmed, and not see meets nobody has confirmed in three months, so that stale directory data does not send me to an empty lot. |
| US-6 | As a host or admin, I want to confirm a meet is still happening in one tap so that it stays prominent. |
| US-7 | As the builder, I want to seed 50 verified meets from a CSV, re-run the file after fixes, and get the same rows updated, so that seeding is repeatable. |

## Scope

In this phase: `venues`, `events`, `event_occurrences` tables and models; polymorphic host with `host_name` denormalization and `created_by_id`; cadence types (once, weekly, monthly, seasonal, announced) on RFC 5545 `rrule` plus `rrule_until`; `MaterializeOccurrencesJob` (90 days ahead, nightly and on write); per-occurrence overrides and cancellation at the model level; `Geo::NearbyQuery` and `Geo::ViewportQuery`; `GET /events`, `GET /events/map`, `GET /events/:slug`, `GET /events/:id/occurrences`, `GET /occurrences/:id`, `POST /events/:id/confirm`; seed decay (`SeedDecayJob`); venue dedupe; `HostConsistencyJob`; the CSV seed format and the `Seeds::EventRowImporter` service used by admin.md A07 and by `bin/rails seeds:import[path]`.

Not in this phase: the write endpoints `POST /events`, `PATCH /events/:id`, `DELETE /events/:id`, `PATCH /occurrences/:id` and their UI (create-and-host-tools.md, Phase 2; this spec defines the model behavior they call); claims (create-and-host-tools.md and admin.md A09); RSVP, check-in, comments, photos (their own specs, attached to `event_occurrences`); feed sections, map screen, list, search UI (discovery.md); event detail screen S08 (event-detail-and-rsvp.md); web event pages (web.md); the importer (import-from-link.md).

## Requirements

**Data**

- R-1 `events.host_type` MUST be one of `User`, `Club`, `Sponsor` with `host_id` validated to exist in the matching table on save (no database FK), and `events.created_by_id` MUST always reference a `users` row (the app account for seeds and admin-created events). (US-3)
- R-2 `events.host_name` MUST be written on every save from the host's `display_name` (User), `name` (Club), or `name` (Sponsor), and MUST be rewritten for every event of a host when that host's name changes (an `after_update` on `profiles`, `clubs`, and `sponsors`). (US-3)
- R-3 `events.cadence` MUST be one of `once`, `weekly`, `monthly`, `seasonal`, `announced`; `once` and `announced` require `rrule` null, `weekly` requires `FREQ=WEEKLY`, `monthly` requires `FREQ=MONTHLY`, `seasonal` requires an `rrule` and a non-null `rrule_until`; `dtstart` MAY be null only for `announced`. (US-3, US-4)
- R-4 `rrule` MUST be validated against this grammar and rejected otherwise with 422 `validation_failed`: `FREQ` in `WEEKLY` or `MONTHLY`; optional `INTERVAL` 1 to 4; `BYDAY` required (weekly: one or more of `MO`..`SU`; monthly: exactly one ordinal day such as `1SU` or `-1SA`); `UNTIL` and `COUNT` MUST NOT appear inside the string (the bound is `rrule_until`). (US-3)
- R-5 `events.slug` MUST be `<kebab-title>-<6 lowercase alphanumerics>` when generated and MAY be supplied explicitly by the seed importer; it is unique and never changes after publish. (US-7)
- R-6 A venue MUST have `location` (geography Point 4326), `timezone` (IANA, default `America/Los_Angeles` when not derivable), `country` ISO alpha-2, and an index `GIST (location)`; `Venues::Deduper.find_or_create` MUST reuse an existing venue whose normalized name (lowercased, whitespace collapsed) matches and whose location is within 100 m (`ST_DWithin`), else create one. (US-7)
- R-7 An occurrence MUST store `starts_at` and `ends_at` in UTC, `location` copied from the venue, `status` in `scheduled`, `cancelled`, `completed`, and MUST be unique on `(event_id, starts_at)`, indexed `GIST (location, starts_at)` with `btree_gist` and `BTREE (starts_at) WHERE status = 'scheduled'`. (US-1)
- R-8 When a venue's `location` changes, every `scheduled` future occurrence of events at that venue MUST get the new `location` in the same transaction. (US-1)
- R-9 `events.occurrences_count` MUST count `scheduled` occurrences only; `event_occurrences.status` MUST move to `completed` by the nightly job once `ends_at` is past. (US-3)

**Recurrence and materialization**

- R-10 `MaterializeOccurrencesJob` MUST run nightly at 02:00 America/Los_Angeles and after every create or schedule change of a `published` event, expand `rrule` from `dtstart` in the event's `timezone` with `ice_cube` up to `now + 90 days` (or `rrule_until` if sooner), and upsert on `(event_id, starts_at)` so running it twice produces no change. (US-3)
- R-11 The materializer MUST skip rows with `overridden_at` set, MUST NOT create rows for `announced`, `draft`, or dormant events, MUST create exactly one row for `once`, and MUST set future `scheduled` rows that the current rule no longer produces to `cancelled` rather than deleting them. (US-3, US-4)
- R-12 Local start time MUST be preserved across DST: a 7:30 am Saturday rule yields 14:30 UTC before 2026-11-01 and 15:30 UTC after. (US-3)
- R-13 A manually created occurrence (admin A04 for an `announced` series, or a host in Phase 2) MUST be saved with `overridden_at` set so the materializer never removes it, and `announced` events MUST accept such rows. (US-4)
- R-14 `GET /events/:slug` MUST enqueue the materializer for that event when its latest `scheduled` occurrence is under 60 days out and the event is recurring, so a missed nightly run self-heals on read (ADR 0003). (US-3)
- R-15 The serializer field `rrule_text` MUST be produced server-side by `Recurrence::Describer`: `FREQ=WEEKLY;BYDAY=SA` gives "Every Saturday"; `INTERVAL=2` gives "Every other Sunday"; `FREQ=MONTHLY;BYDAY=1SU` gives "First Sunday of the month"; `BYDAY=-1SA` gives "Last Saturday of the month"; seasonal appends " through Oct 31"; `announced` gives "Dates announced by the host"; `once` gives null. (US-3, US-4)

**Geo and API**

- R-16 `GET /events` with `near` MUST query `event_occurrences` with `ST_DWithin(location, origin, radius_m)` and `starts_at BETWEEN from AND to`, join `events` for `status = 'published'`, `visibility = 'public'`, `dormant_at IS NULL`, return one EventSummary per event with its earliest occurrence in the window as `next_occurrence`, include `distance_m` from `ST_Distance`, default `radius_km` 32 (80 when `q` is present), clamp to 160, default window now to +14 days, maximum window 90 days. (US-1)
- R-17 `GET /events` with `bbox=w,s,e,n` MUST use `ST_Intersects(location, ST_MakeEnvelope(w, s, e, n, 4326)::geography)` with the same joins; `near` and `bbox` together MUST return 400 `bad_request`. (US-2)
- R-18 `GET /events` without `near` or `bbox` but with `host=<type>:<id>`, `sponsor=<id>`, or `q` MUST query `events` directly, include `announced` events with `next_occurrence` null, and order by `next_occurrence.starts_at` nulls last. (US-4)
- R-19 Filters MUST compose: `tags[]` matches any tag (`&&`), `recurring=true` means `cadence != 'once'`, `q` matches `events.title` or `events.host_name` by trigram similarity (`%` operator, threshold 0.3) or `venues.name` `ILIKE`; `sort=date` (default) orders by the local calendar day of `starts_at`, then `stale` (fresh first), then `starts_at`, then `distance_m`; `sort=distance` requires `near` and orders by `distance_m`. (US-1)
- R-20 Ordering MUST place stale events after fresh ones within the same local calendar day of `starts_at` (see R-25), and the response MUST paginate by opaque cursor with `meta.next_cursor`. (US-5)
- R-21 `GET /events/map` MUST require `bbox`, apply `from`, `to`, `tags[]`, return one MapPin per event (its earliest occurrence in the window), cap at 500 ordered by `starts_at`, and set `meta.truncated: true` when more matched. (US-2)
- R-22 `GET /events/:slug` MUST return the Event shape with `upcoming_occurrences` (next 4 `scheduled` or `cancelled`), `dormant`, 404 for `draft` unless the viewer can edit, and 404 for `unlisted` unless `token` matches or the viewer can edit; `GET /events/:id/occurrences` MUST return upcoming occurrences including `cancelled` ones, paginated; `GET /occurrences/:id` MUST return the Occurrence shape with `timezone` and `override_note`. (US-3)
- R-23 Distance math MUST happen in PostGIS only; no Ruby code MAY compute haversine or compare coordinates, and `distance_m` MUST be an integer number of meters. (US-1)
- R-24 `POST /events/:id/confirm` MUST require the host (user host, owner or admin of the hosting club, or a platform admin), set `last_confirmed_at` to now, clear `dormant_at`, enqueue the materializer when it was dormant, and return the Event; anyone else gets 403. (US-6)

**Confirmation and seed decay**

- R-25 An event is `stale` when `claimed_at IS NULL AND COALESCE(last_confirmed_at, published_at) < now() - interval '30 days'`; `stale` MUST be exposed on EventSummary and computed in SQL. (US-5)
- R-26 `SeedDecayJob` (nightly at 02:45 America/Los_Angeles) MUST set `dormant_at = now()` on events where `claimed_at IS NULL AND status = 'published' AND dormant_at IS NULL AND COALESCE(last_confirmed_at, published_at) < now() - interval '90 days'`, and MUST log the count and slugs. (US-5)
- R-27 A dormant event MUST be excluded from `GET /events`, `GET /events/map`, `GET /feed`, search, host page upcoming lists, and the web sitemap, MUST still return 200 on `GET /events/:slug` with `dormant: true`, and MUST keep its existing occurrences untouched (no cancellation, no notifications). (US-5)
- R-28 `dormant_at` MUST be cleared by `POST /events/:id/confirm`, by claim approval (admin.md A09), and by an admin "Verify now" or schedule edit (admin.md A04); the seed importer MUST set `last_confirmed_at` and `verified_at` to `verified_date` and only ever move `last_confirmed_at` forward. (US-5, US-7)

**Seeds and jobs**

- R-29 `Seeds::EventRowImporter` MUST accept the CSV format in Data, validate every row before writing any (dry run returns a per-row report with `action` in `create`, `update`, `skip`, `error`), upsert on `slug`, resolve `host_type` and `host_slug` (blank means the app account as `User`), dedupe the venue per R-6, create `event_sponsorships` from `sponsors`, and never overwrite `host_*` or `claimed_at` on a claimed event (report `skip` for those columns). (US-7)
- R-30 Every seed row MUST have `verification_source_url` and `verified_date` (gaps item 6); rows without them MUST be rejected with a row-level error. (US-7)
- R-31 `HostConsistencyJob` (nightly at 02:30 America/Los_Angeles) MUST report every published event whose host row is missing or whose club or sponsor is `hidden`, rewrite any `host_name` that differs from the host's current name, and expose the report to the admin dashboard (A02) and Sentry as a breadcrumb. (US-3)
- R-32 `bin/rails seeds:import[path]` MUST run the same importer as A07 with `dry_run` off and print the report. (US-7)

**Mobile**

- R-33 None in this spec: every mobile consumer (S02, S03, S04, S05, S08) lives in discovery.md or event-detail-and-rsvp.md and renders the shapes defined here.

**Web**

- R-34 None in this spec: W02, W03, W04, W12 in web.md consume the same endpoints.

## Data

`venues` (all columns in `docs/data-model.md`; note `timezone` default and the `(external_source, external_place_id)` index). `events`: `host_type`, `host_id`, `host_name`, `created_by_id`, `venue_id`, `import_id`, `title`, `slug`, `description`, `dtstart` (nullable for `announced`), `duration_minutes`, `timezone`, `rrule`, `rrule_until`, `tags`, `status`, `visibility`, `source_url`, `source_type`, `external_host_name`, `capacity`, `rsvp_mode`, `published_at`, `claimed_at`, `last_confirmed_at`, `verification_source_url`, `verified_at`, `occurrences_count`, `followers_count`, plus `cadence` (text, not null, default `once`) and `dormant_at` (timestamptz, nullable), both adopted 2026-09-06; indexes as listed there plus `BTREE (dormant_at) WHERE dormant_at IS NOT NULL` and `BTREE (claimed_at, last_confirmed_at)` for the decay job. `event_occurrences`: every column. `event_sponsorships` is written by the importer (`sponsor_id`, `role`, `note`, `position`). Migration: the first Phase 1 migration creates all three tables with PostGIS enabled, in one PR with clubs and sponsors (clubs.md slice 1).

Seed CSV format (`events.csv`, UTF-8, header row, one event per row). Columns in order:

| Column | Rule |
|---|---|
| `slug` | Required, natural key for upsert, `[a-z0-9-]`, 3 to 60 chars |
| `title`, `description` | Required title; description optional Markdown subset |
| `host_type`, `host_slug` | `user`, `club`, or `sponsor` plus handle or slug; blank means the app account; unknown slug is a row error |
| `venue_name`, `venue_address_line1`, `venue_address_line2`, `venue_city`, `venue_region`, `venue_postal_code`, `venue_country`, `venue_lat`, `venue_lng`, `venue_external_place_id`, `venue_timezone` | Name, city, region, country, lat, lng required; lat in -90..90, lng in -180..180; timezone optional, default `America/Los_Angeles` |
| `cadence` | Required: `once`, `weekly`, `monthly`, `seasonal`, `announced` |
| `dtstart_local` | `YYYY-MM-DD HH:MM` in the venue timezone; required unless `announced` |
| `duration_minutes` | Required integer 15 to 720 |
| `rrule`, `rrule_until` | Per R-3 and R-4; `rrule_until` as `YYYY-MM-DD`, end of that day in the venue timezone |
| `tags` | Pipe-separated from the allowed set; blank means `all` |
| `rsvp_mode`, `visibility`, `status` | Defaults `open`, `public`, `published` |
| `source_url`, `source_type`, `external_host_name` | Source link to the organizer's post or page; `source_url` must be unique across events |
| `verification_source_url`, `verified_date` | Required (R-30); `verified_date` as `YYYY-MM-DD`, not in the future |
| `sponsors` | Pipe-separated `<sponsor_slug>:<role>` with role in `presented_by`, `coffee`, `vendor`, `partner`; unknown slug is a row error |

Blank cells leave existing values unchanged on update and take the default on create. Clubs and sponsors referenced by a row must already exist (their CSV formats are in admin.md and import first). The importer does not accept cover images (gaps item 15).

## API

`GET /events`, `GET /events/map`, `GET /events/:slug`, `GET /events/:id/occurrences`, `GET /occurrences/:id`, `POST /events/:id/confirm`, all as in `docs/api.md`, with these deltas: EventSummary gains `stale: boolean` and `cadence`; Event gains `dormant: boolean`; `GET /events` returns 400 `bad_request` for `near` with `bbox`, for a window over 90 days, and for `sort=distance` without `near`; `GET /events/map` returns one pin per event. Shapes consumed: Host, EventSummary, Event, Occurrence, MapPin. Write endpoints are listed in create-and-host-tools.md and call the model rules in R-3, R-4, R-10, R-11, R-13.

## Screens and states

| Screen id | Screen | Route (mobile / web) | Primary actions | States |
|---|---|---|---|---|
| S08 | Event detail (consumer) | `meets/[slug]` / `/meets/:slug` | Owned by event-detail-and-rsvp.md | This spec supplies the data for `cancelled`, `unclaimed`, `unlisted`, and `no longer listed` (404) states, plus the `stale` chip and the `dormant` variant of unclaimed |

No screen is owned here. Copy below is the exact wording consumers must use for the states this spec defines.

## Copy

| Where | String |
|---|---|
| `rrule_text`, weekly | Every Saturday |
| `rrule_text`, biweekly | Every other Sunday |
| `rrule_text`, monthly | First Sunday of the month |
| `rrule_text`, monthly last | Last Saturday of the month |
| `rrule_text`, seasonal | Every Saturday through Oct 31 |
| `rrule_text`, announced | Dates announced by the host |
| Card chip, stale (consumers) | Check. Last confirmed Jul 12. |
| Card chip, fresh, unclaimed | Unclaimed. Last confirmed Aug 30. |
| Detail, dormant | Not confirmed since Jun 1. Are you the host? Confirm it and it comes back. |
| Detail, announced, no dates | No dates listed yet. Follow to hear when the host posts one. |
| Occurrence, cancelled | Cancelled this week. Host note: {override_note} |
| `GET /events` 400, near and bbox | Send near or bbox, not both. |
| `GET /events` 400, window | The window can be at most 90 days. |
| Importer row error, missing verification | Row {n}: verification_source_url and verified_date are required. |
| Importer row error, unknown host | Row {n}: no {host_type} with slug {host_slug}. |
| Importer row error, bad rrule | Row {n}: rrule must be FREQ=WEEKLY or FREQ=MONTHLY with BYDAY and no UNTIL or COUNT. |

## Acceptance criteria

Geo fixtures used below (real coordinates, `starts_at` next Saturday 07:30 America/Los_Angeles unless stated). Coastal Orange County, origin Lido Marina Village, Newport Beach `33.6172,-117.9270`: Corona del Mar `33.5990,-117.8740` (5.3 km), Huntington Beach Pier `33.6553,-118.0036` (8.3 km), Laguna Main Beach `33.5422,-117.7831` (15.7 km), Irvine Spectrum `33.6497,-117.7441` (17.3 km), Dana Point Harbor `33.4600,-117.6980` (27.5 km), San Clemente Pier `33.4207,-117.6208` (35.8 km), Victoria Gardens, Rancho Cucamonga `34.1090,-117.5310` (65.8 km). Inland Empire, origin Fontana, Sierra at Foothill `34.1065,-117.4356`: Victoria Gardens (8.8 km), Ontario Mills `34.0737,-117.5545` (11.5 km), Riverside Mission Inn `33.9825,-117.3735` (14.9 km), Redlands State Street `34.0556,-117.1825` (24.0 km), Irvine Spectrum (58.2 km), Lido (70.8 km).

| Id | Given | When | Then | Proves |
|---|---|---|---|---|
| AC-1 | One published occurrence at each coastal fixture | `GET /events?near=33.6172,-117.9270` | Five events (Corona del Mar, Huntington, Laguna, Irvine, Dana Point) in that order, each with integer `distance_m`; Corona del Mar's is between 5,200 and 5,400; San Clemente and Victoria Gardens absent | R-16, R-19, R-23 |
| AC-2 | Same fixtures | `GET /events?near=33.6172,-117.9270&radius_km=80&sort=distance`, then `radius_km=500` | Seven events with San Clemente sixth and Victoria Gardens seventh; `radius_km=500` behaves as 160 and returns the same seven | R-16, R-19 |
| AC-3 | One published occurrence at each Inland Empire fixture plus Lido | `GET /events?near=34.1065,-117.4356` | Four events ordered by `starts_at` then distance (Victoria Gardens, Ontario Mills, Riverside, Redlands); Irvine and Lido absent | R-16 |
| AC-4 | Coastal fixtures | `GET /events?bbox=-118.05,33.40,-117.60,33.70` | Six events (every coastal fixture including Irvine Spectrum and San Clemente, excluding Victoria Gardens); `GET /events?near=33.6172,-117.9270&bbox=...` is 400 `bad_request` | R-17 |
| AC-5 | 501 published occurrences inside a bbox over Fontana, staggered by one minute | `GET /events/map?bbox=...` | 500 MapPins, the soonest 500, `meta.truncated: true`; with 12 occurrences the count is 12 and `truncated` is false | R-21 |
| AC-6 | A weekly Saturday event at Victoria Gardens with occurrences on the next two Saturdays inside a 14-day window | `GET /events?near=34.1065,-117.4356` and `GET /events/map` over it | One EventSummary and one MapPin, `next_occurrence` is the nearer Saturday | R-16, R-21 |
| AC-7 | An event with `dtstart` 2026-10-24 07:30 America/Los_Angeles, `rrule` `FREQ=WEEKLY;BYDAY=SA`, `cadence` `weekly` | `MaterializeOccurrencesJob` runs twice | 13 or 14 `scheduled` rows within 90 days, the count identical after the second run; `starts_at` for Oct 31 is `14:30Z` and for Nov 7 is `15:30Z`; `ends_at` equals `starts_at` plus `duration_minutes` | R-10, R-12 |
| AC-8 | The event from AC-7 with the Nov 14 occurrence edited to 08:00 local and `overridden_at` set, then the rule changed to `BYDAY=SU` | The job runs | The Nov 14 row keeps 08:00; every other Saturday row in the future is `cancelled`, none deleted; Sunday rows exist | R-11 |
| AC-9 | `cadence` `monthly` with `FREQ=MONTHLY;BYDAY=1SU`, and `cadence` `seasonal` with `FREQ=WEEKLY;BYDAY=SA` and `rrule_until` 2026-10-31 | The job runs on 2026-10-01 | Monthly rows fall on Oct 4, Nov 1, Dec 6 only; seasonal rows stop at Oct 31 (none in November) | R-3, R-10 |
| AC-10 | An `announced` event with `rrule` null and `dtstart` null | The job runs; then an admin adds one occurrence for next Saturday | Zero rows after the job; one row with `overridden_at` set afterwards that survives another job run; `GET /events?host=club:<id>` lists the event with `rrule_text` "Dates announced by the host" | R-3, R-11, R-13, R-15, R-18 |
| AC-11 | Rrules `FREQ=DAILY`, `FREQ=WEEKLY` (no BYDAY), `FREQ=WEEKLY;BYDAY=SA;UNTIL=20261231T000000Z`, `FREQ=MONTHLY;BYDAY=SA,SU`, and `cadence` `weekly` with `rrule` null | Each is saved | Validation error every time with the bad-rrule message | R-3, R-4 |
| AC-12 | A club named "Back Bay Air-Cooled" hosting two events | The club is renamed in the admin UI; a profile `display_name` changes for a user host | `host_name` on both club events, and on the user's events, matches the new names; `HostConsistencyJob` reports zero | R-2, R-31 |
| AC-13 | An event whose `host_id` points at a deleted club, another at a `hidden` sponsor | `HostConsistencyJob` runs | Both slugs appear in the report; `GET /events/:slug` still returns 200 for each | R-31 |
| AC-14 | Venue "Back Bay Coffee" at `33.6172,-117.9270` | `Venues::Deduper.find_or_create` with "back bay  coffee" at `33.6177,-117.9270` (about 55 m), then with the same name at `33.6186,-117.9270` (about 155 m) | The first call returns the existing venue; the second creates a new one | R-6 |
| AC-15 | A venue moved 300 m with two future and one past occurrence | The venue is saved | Both future `scheduled` rows have the new `location`; the past row is unchanged | R-8 |
| AC-16 | Two unclaimed events on the same Saturday at 5 km and 6 km, the nearer one with `last_confirmed_at` 31 days ago, the farther one confirmed yesterday | `GET /events?near=...` | The farther one is first; the nearer one has `stale: true`; a claimed event confirmed 200 days ago has `stale: false` | R-20, R-25 |
| AC-17 | An unclaimed event with `last_confirmed_at` 91 days ago and another 89 days ago | `SeedDecayJob` runs | Only the first has `dormant_at`; it is absent from `GET /events` and `GET /events/map`; `GET /events/:slug` returns 200 with `dormant: true`; its occurrences are unchanged | R-26, R-27 |
| AC-18 | The dormant event from AC-17 | `POST /events/:id/confirm` as an admin, then as a member with no role | Admin: 200, `dormant_at` null, `last_confirmed_at` now, the materializer enqueued; member: 403 | R-24, R-28 |
| AC-19 | A recurring event whose latest `scheduled` occurrence is 45 days out | `GET /events/:slug` | 200 and a `MaterializeOccurrencesJob` is enqueued for that event; with 75 days out, none is enqueued | R-14 |
| AC-20 | A 12-row `events.csv` with 6 coastal and 6 Inland Empire meets, one row missing `verified_date`, one with an unknown `host_slug` | `Seeds::EventRowImporter.call(file, dry_run: true)` | 10 `create`, 2 `error` with row numbers and the copy above, zero database writes; with `dry_run: false` and the two rows fixed, 12 events exist with `verified_at` and `last_confirmed_at` equal to `verified_date`, sponsorships created, and one venue shared by rows that name the same lot within 100 m | R-29, R-30, R-6 |
| AC-21 | The same file re-run after editing one title and lowering one `verified_date` | `dry_run: false` | 1 `update`, 11 `skip` (no change); the lowered date does not move `last_confirmed_at` backwards; a claimed event's row reports its host columns as skipped | R-29, R-28 |
| AC-22 | An event with `visibility` `unlisted` and one with `status` `draft` | `GET /events?near=...`, `GET /events/:slug` anonymous | Neither appears in the list; the unlisted one is 404 by slug and 200 with its `token`; the draft is 404 | R-16, R-22 |
| AC-23 | `GET /events/:id/occurrences` for an event with three scheduled and one cancelled upcoming date | Anonymous request | Four rows including the cancelled one with `status` `cancelled` and `override_note`; `GET /occurrences/:id` on it returns `timezone` `America/Los_Angeles` | R-22 |

## Verification

| Check | How |
|---|---|
| API | `pnpm --filter @curb/api test spec/requests/api/v1/events_spec.rb spec/requests/api/v1/occurrences_spec.rb spec/models/event_spec.rb spec/models/event_occurrence_spec.rb spec/models/venue_spec.rb spec/services/geo/*_spec.rb spec/services/recurrence/*_spec.rb spec/services/venues/deduper_spec.rb spec/services/seeds/event_row_importer_spec.rb spec/jobs/materialize_occurrences_job_spec.rb spec/jobs/seed_decay_job_spec.rb spec/jobs/host_consistency_job_spec.rb` against the PostGIS service container; geo specs use the fixture coordinates above, never mocks |
| Query plans | A spec that runs `EXPLAIN` on the R-16 query with 5,000 occurrences and asserts the GiST index on `event_occurrences` is used (no `Seq Scan` on the table) |
| Seed data | `bin/rails seeds:import[db/seeds/events.csv]` on a fresh database, then AC-1 and AC-3 style requests against the real seeds from Newport Beach and Fontana |
| Mobile | None here; discovery.md and event-detail-and-rsvp.md verify on device |
| Design | None; consumers reference Figma frames |

## Risks and open questions

- Adopted 2026-09-06 into docs/data-model.md: add `events.cadence` (text, not null, default `once`, values `once`, `weekly`, `monthly`, `seasonal`, `announced`), `events.dormant_at` (timestamptz, nullable), and make `events.dtstart` nullable only for `announced` (gaps item 7).
- Adopted 2026-09-06 into docs/api.md: EventSummary gains `stale` and `cadence`; Event gains `dormant`; document the 400 cases in R-16, R-17, R-19 and the one-pin-per-event rule on `GET /events/map`.
- Adopted 2026-09-06 into docs/architecture.md section 3.5 and ADR 0003: the materialization horizon is 90 days (this spec and `docs/app-overview.md`), not 8 weeks; the read-time trigger threshold becomes 60 days.
- Adopted 2026-09-06 into docs/api.md: `POST /events/:id/occurrences` (host) for announced series, owned by create-and-host-tools.md; until then only A04 creates occurrences by hand.
- Gaps item 5: the decay clock is 30 and 90 days on `COALESCE(last_confirmed_at, published_at)` for unclaimed events only. Phase 4 may add RSVPs, check-ins, and photos as activity; the SQL is one `GREATEST` away.
- Gaps item 4: `last_confirmed_at` is the unit of truth this spec exposes; "Confirmed by host" copy and the "Still happening?" prompt for claimed events belong to event-detail-and-rsvp.md and notifications.md.
- Gaps item 8 and 6: the first seed file targets 25 coastal Orange County and 25 Inland Empire meets, every row verified by hand with `verification_source_url`; coastal rows will lag and the importer must not need a full file to be useful.
- `docs/app-overview.md` describes a `RecurrenceRule` stored as fields; the data model stores an RFC 5545 string, which this spec follows. The grammar in R-4 keeps the string small enough to validate and describe without a parser dependency beyond `ice_cube`.
- Venue timezone derivation from coordinates needs a lookup; deferred to Phase 2 when venues are created in-app, since every seed is in `America/Los_Angeles`.
- `HostConsistencyJob` reports rather than fixes hidden hosts, because a hidden club's events stay visible by design (clubs.md R-5).

## Session breakdown

| Slice | Deliverable | Covers | Must pass |
|---|---|---|---|
| 1 (Phase 1) | Migration for `venues`, `events`, `event_occurrences` (with clubs and sponsors tables per clubs.md slice 1), models, validations, rrule grammar validator, slug generator, `host_name` callbacks, counter caches, factories | R-1 to R-9 | AC-11, AC-12 (model part), AC-15 |
| 2 (Phase 1) | `Recurrence::Materializer`, `MaterializeOccurrencesJob`, `Recurrence::Describer`, `config/recurring.yml`, completion of past occurrences | R-10 to R-13, R-15 | AC-7 to AC-10 |
| 3 (Phase 1) | `Geo::NearbyQuery`, `Geo::ViewportQuery`, `GET /events`, `GET /events/map`, Host, EventSummary, MapPin serializers, rswag specs, `EXPLAIN` spec | R-16 to R-21, R-23 | AC-1 to AC-6, AC-16 (ordering), AC-22 |
| 4 (Phase 1) | `GET /events/:slug`, `GET /events/:id/occurrences`, `GET /occurrences/:id`, `POST /events/:id/confirm`, Event and Occurrence serializers, read-time materialization trigger, Pundit `EventPolicy#confirm?` | R-14, R-22, R-24 | AC-18, AC-19, AC-22, AC-23 |
| 5 (Phase 1) | `stale` in SQL, `SeedDecayJob`, `HostConsistencyJob`, `Venues::Deduper`, dashboard report hook for admin.md A02 | R-25 to R-28, R-31, R-6 | AC-13, AC-14, AC-16, AC-17 |
| 6 (Phase 1) | `Seeds::EventRowImporter` with dry run and report, `seeds:import` rake task, CSV fixtures, `db/seeds/events.csv` with the first 20 verified rows (10 coastal, 10 Inland Empire) | R-29, R-30, R-32 | AC-20, AC-21, seed check in Verification |

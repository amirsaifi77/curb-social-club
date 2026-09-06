# Spec: Admin

Status: draft. Phase: 0 (namespace, sign-in, jobs), 1 (dashboard, CRUD, CSV seeds), 2 (claim review, moderation queue), 4 (spots). Last updated: 2026-09-06.
Depends on: auth-and-accounts.md (`Auth::GoogleTokenVerifier`, roles), events-and-occurrences.md (models, `Seeds::EventRowImporter`, CSV format), clubs.md, sponsors.md, moderation-and-safety.md (queue policy), spots.md. Related decisions: ADR 0002, ADR 0006, ADR 0010, `apps/api/README.md` (planned structure), gaps items 5, 6, 12.

## Summary

The admin UI is the builder's tool for seeding and keeping the schedule true: hand-written ERB views under `/admin` on the API host, one layout, one table partial, cookie sessions for `admin` and `moderator` roles, and no admin gem. It edits venues, events, occurrences, clubs, memberships, sponsors, sponsorships, users, and spots, imports the seed CSVs with a dry run, reviews claims, works the moderation queue, and exposes Mission Control for jobs. Every write is audited and every route bounces non-admins.

## User stories

| Id | Story |
|---|---|
| US-1 | As the admin, I want to sign in with my Google account and land on a dashboard so that I can see what needs attention on a Sunday night. |
| US-2 | As the admin, I want to create and edit venues, events, occurrences, clubs, sponsors, and their relationships in plain forms so that the seeded schedule is right without a console. |
| US-3 | As the admin, I want to upload a CSV, see exactly what it would change, then apply it, and re-run the same file safely, so that seeding is repeatable. |
| US-4 | As the admin, I want to verify and confirm a seeded meet in one click so that it stays out of decay. |
| US-5 | As a moderator, I want to approve or reject a claim with a note so that the host takes over the meet and the claimant knows why if not. |
| US-6 | As a moderator, I want a queue of open reports with the actions the policy allows so that I can answer within 24 hours. |
| US-7 | As the admin, I want a record of who changed what so that a wrong edit can be traced and undone. |
| US-8 | As the builder, I want a test that proves every `/admin` route redirects non-admins so that a new screen cannot leak. |

## Scope

In Phase 0: the `Admin` namespace wiring (ActionView, cookies, session, flash, CSRF, Propshaft for one stylesheet and one small script), A01 sign-in and sign-out, A12 Mission Control at `/admin/jobs`, the route sweep spec, the `admin_audits` table and the `Admin::Auditable` concern.

In Phase 1: A02 dashboard; A03 venues; A04 events with occurrences and sponsorships; A05 clubs with memberships; A06 sponsors; A07 CSV seed import; A08 users. In Phase 2: A09 claim review; A10 moderation queue and actions (screens and actions here, policy in moderation-and-safety.md). In Phase 4: A11 spots CRUD and merge.

Not in this spec: a JSON admin API (none; the admin has no OpenAPI contract); a React admin (never at launch); host-facing dashboards (Phase 7); the moderation rules for auto-hide, thresholds, and appeals (moderation-and-safety.md); analytics (Phase 5); sponsor and club self-service (Phase 7).

## Requirements

**Data**

- R-1 Every non-GET admin request that changes a row MUST write an `admin_audits` row with `admin_id`, `action`, `target_type`, `target_id`, `changes` (before and after for changed attributes, excluding blobs and bodies over 2,000 chars), and `ip`. (US-7)
- R-2 Admin edits of `events` MUST keep `host_name` in sync (events-and-occurrences.md R-2), MUST enqueue the materializer when `dtstart`, `duration_minutes`, `timezone`, `rrule`, `rrule_until`, `cadence`, `venue_id`, or `status` change, and MUST clear `dormant_at` on any such change or on Verify now. (US-2, US-4)
- R-3 Suspending a user MUST set `users.status` `suspended` and delete every `sessions` row of that user in the same transaction; unsuspending sets `active`. (US-2)
- R-4 Deleting a user from A08 MUST run the same path as `DELETE /me` (`AccountDeletionJob`), never a raw destroy. (US-2)

**Namespace and auth**

- R-5 Admin controllers MUST inherit from `Admin::BaseController < ActionController::Base` with `protect_from_forgery with: :exception`, a `before_action :require_admin_session`, and `layout "admin"`; `Api::V1` controllers MUST stay on `ActionController::API` and MUST never set a cookie. (US-8)
- R-6 `config/application.rb` MUST keep `config.api_only = true` and add `ActionDispatch::Cookies`, `ActionDispatch::Session::CookieStore` (key `_curb_admin`, `same_site: :lax`, `secure` outside development and test, `expire_after: 12.hours`), and `ActionDispatch::Flash`; Propshaft MUST serve only `app/assets/stylesheets/admin.css` and `app/assets/javascripts/admin.js`. (US-1)
- R-7 A01 MUST render the Google Identity Services button (script from `https://accounts.google.com/gsi/client`, allowed by CSP for `/admin` only) which posts `credential` to `POST /admin/session`; the controller MUST verify it with `Auth::GoogleTokenVerifier` using `GOOGLE_ADMIN_CLIENT_ID` as audience, look up `identities` by `(provider: "google", provider_uid: sub)`, and start a session only when the user's `role` is `admin` or `moderator` and `status` is `active`, after `reset_session`. (US-1)
- R-8 A non-admin identity, an unknown identity, or an invalid token on `POST /admin/session` MUST redirect to `/admin/sign_in` with the flash in Copy and MUST NOT set a session; `DELETE /admin/session` MUST `reset_session` and redirect to `/admin/sign_in`. (US-1, US-8)
- R-9 Every route under `/admin` except `GET /admin/sign_in` and `POST /admin/session` MUST redirect anonymous and `member` sessions to `/admin/sign_in` with 302; a `moderator` MUST see A02, A08 (list, show, suspend only), A09, A10, and MUST get 302 to `/admin` with the flash in Copy on everything else; `admin` sees everything. (US-8)
- R-10 The first admin MUST be granted by `bin/rails admin:grant[email]`, which sets `users.role` for an existing user; there is no self-service path to `admin`. (US-1)
- R-11 rack-attack MUST throttle `POST /admin/session` to 10 per minute per IP, `POST /admin/seeds` to 10 per hour per IP, and all of `/admin` to 300 per minute per IP. (US-8)
- R-12 Mission Control MUST mount at `/admin/jobs` with `MissionControl::Jobs.base_controller_class = "Admin::BaseController"` and be `admin` only. (US-1)

**Screens**

- R-13 A02 MUST show counts (published events, scheduled occurrences in the next 14 days, venues, active clubs, active sponsors, users), job health (failed jobs count, last run time and status of `MaterializeOccurrencesJob`, `SeedDecayJob`, `HostConsistencyJob` from their audit rows or Solid Queue), the latest `HostConsistencyJob` report, the count of stale and dormant unclaimed events with a link to A04 filtered, and, from Phase 2, open reports and pending claims counts. (US-1)
- R-14 A03 MUST list venues with search on `name` and `city` (Pagy offset, 50 per page) and edit `name`, `address_line1`, `address_line2`, `city`, `region`, `postal_code`, `country`, `lat` and `lng` (written to `location`), `timezone`, `external_place_id`, `external_source`, showing upcoming events at the venue on the show page. (US-2)
- R-15 A04 MUST list events with filters `status`, `host_type`, `claimed` (yes or no), `stale`, `dormant`, and `q`, and edit `title`, `slug` (locked once published), `description`, `host_type` plus a host picker by name that writes `host_id` and `host_name`, `venue_id` via a venue picker by name, `cadence`, `dtstart` (entered local in the event `timezone`), `duration_minutes`, `timezone`, `rrule`, `rrule_until`, `tags`, `status`, `visibility`, `source_url`, `source_type`, `external_host_name`, `capacity`, `rsvp_mode`, `verification_source_url`, `verified_at`, `last_confirmed_at`, the cover attachment, and nested `event_sponsorships` (sponsor picker, `role`, `note`, `position`). (US-2)
- R-16 A04 MUST provide the buttons Verify now (sets `verified_at` and `last_confirmed_at` to now), Confirm now (sets `last_confirmed_at`), and Re-materialize (enqueues the job), each with a confirm prompt and an audit row. (US-4)
- R-17 `/admin/events/:id/occurrences` MUST list occurrences from 30 days back to 90 days ahead with `status`, `override_note`, `going_count`, and `overridden_at`, and MUST allow: edit `starts_at`, `ends_at`, `status`, `override_note` (sets `overridden_at`); cancel with a required note; add an occurrence (required for `announced` events, sets `overridden_at`); reset override (clears `overridden_at`, `override_note`, and re-materializes). (US-2)
- R-18 A05 MUST edit `name`, `slug`, `description`, `avatar`, `banner`, `home_lat` and `home_lng` (to `home_location`), `home_label`, `links` (six fields), `join_policy`, `status` (`active`, `hidden`), `verified`, and `/admin/clubs/:id/memberships` MUST list memberships and add one by handle with `role`, change `role`, and remove, with the model's single-owner rule surfacing as a form error. (US-2)
- R-19 A06 MUST edit `name`, `slug`, `kind`, `tagline`, `description`, `logo`, `banner`, `website`, `links`, `home_lat` and `home_lng`, `home_label`, `status`, `verified`, and show hosted and sponsored events. (US-2)
- R-20 A07 MUST accept one file and a `kind` in `venues`, `clubs`, `sponsors`, `events`, store the upload as an Active Storage blob, render a dry-run preview (row number, natural key, `action`, resolved venue action, errors) without writing, then apply on a second submit that passes the blob's signed id, and render a results page with the same columns; files over 500 rows MUST be rejected with the copy below. (US-3)
- R-21 The `events` kind MUST use `Seeds::EventRowImporter` (events-and-occurrences.md); `clubs`, `sponsors`, and `venues` MUST use sibling importers with the natural keys `slug`, `slug`, and `(name within 100 m)` and the column lists in Data, all idempotent. (US-3)
- R-22 A08 MUST list users with search on `handle` and `email`, show identities, session count, role, status, hosted events, and reports, and allow `role` change (`admin` only, never on oneself), suspend and unsuspend (`admin` and `moderator`), and delete (`admin` only, confirm prompt). (US-2)
- R-23 A09 MUST list `claim_requests` with `status` `pending` first, showing event, claimant profile, `claim_as` host, `relationship`, `evidence_url`, and MUST approve in one transaction that sets `events.host_type`, `host_id`, `host_name`, `claimed_at`, clears `dormant_at`, marks the request `approved` with `reviewed_by_id` and `reviewed_at`, rejects every other pending claim on that event with the note in Copy, and enqueues the `claim_approved` notification; reject MUST require `review_note` and enqueue `claim_rejected`; approving an already-claimed event MUST fail with the flash in Copy. (US-5)
- R-24 A10 MUST list `reports` grouped by `(reportable_type, reportable_id)` with open count, reasons, and details, open first, and offer the actions `hide`, `remove`, `restore`, `warn_user`, `suspend_user`, `dismiss`, each writing `moderation_actions` and updating `reports.status`; which action is allowed for which target and reason is moderation-and-safety.md's rule and MUST be read from one policy object, not from the view. (US-6)
- R-25 A11 MUST edit `spots` (`name`, `slug`, `description`, `lat` and `lng`, `address_label`, `city`, `region`, `access`, `access_notes`, `status`) and merge two spots in one transaction: move `photos.spot_id` and `external_media.spot_id` from the loser to the survivor, set the loser `status` `removed`, recompute both `photos_count` and `last_photo_at`, and audit both ids. (US-2)
- R-26 Every list MUST use the shared partial `admin/shared/_table.html.erb` (columns, rows, empty copy) and every form the shared `_form_errors` and `_field` partials; destructive buttons use `admin.js` event delegation on `data-confirm`, no inline scripts. (US-2)
- R-27 Times in admin MUST display in `America/Los_Angeles` with the zone abbreviation, and occurrence times in the event's `timezone`. (US-2)

**Mobile**

- R-28 None: the admin is a web surface on the API host.

**Web**

- R-29 None in `apps/web`: the admin is not part of the React Router app and MUST NOT be linked from public pages.

**Admin and jobs**

- R-30 A request spec MUST enumerate `Rails.application.routes` under `/admin` (including Mission Control's engine routes), substitute a UUID for every `:id`, and assert 302 to `/admin/sign_in` for anonymous and `member` sessions on every GET, and 302 or 422 (CSRF) on every non-GET, so a new route cannot ship unguarded. (US-8)
- R-31 A request spec MUST assert that `GET /v1/health` and one `Api::V1` write endpoint respond without `Set-Cookie`. (US-8)

## Data

Reads and writes every table it edits: `venues`, `events`, `event_occurrences`, `event_sponsorships`, `clubs`, `club_memberships`, `sponsors`, `users`, `identities` (read), `sessions` (delete on suspend), `claim_requests`, `reports`, `moderation_actions`, `spots`, `photos.spot_id`, `external_media.spot_id`. `admin_audits` (adopted 2026-09-06). Seed CSVs beyond `events.csv` (which events-and-occurrences.md defines):

| File | Natural key | Columns |
|---|---|---|
| `clubs.csv` | `slug` | `slug, name, description, home_lat, home_lng, home_label, join_policy, verified, instagram, youtube, tiktok, x, threads, website, owner_handle` (blank owner means the app account) |
| `sponsors.csv` | `slug` | `slug, name, kind, tagline, description, website, home_lat, home_lng, home_label, verified, instagram, youtube, tiktok, x, threads` |
| `venues.csv` (optional; events rows carry venue fields) | normalized `name` within 100 m | `name, address_line1, address_line2, city, region, postal_code, country, lat, lng, timezone, external_place_id, external_source` |

Import order: venues (if used), sponsors, clubs, events. Seed files live in `apps/api/db/seeds/` and are committed.

## API

None in v1. Admin routes are Rails resources under `namespace :admin`: `GET /admin/sign_in`, `POST /admin/session`, `DELETE /admin/session`, `GET /admin`, `resources :venues, :events, :clubs, :sponsors, :users, :spots`, nested `events/:id/occurrences`, `clubs/:id/memberships`, `POST /admin/events/:id/verify`, `POST /admin/events/:id/confirm`, `POST /admin/events/:id/rematerialize`, `GET|POST /admin/seeds`, `POST /admin/seeds/apply`, `resources :claims` with `approve` and `reject`, `resources :reports` with `actions`, `POST /admin/spots/:id/merge`, `mount MissionControl::Jobs::Engine => "/admin/jobs"`. The public API's `POST /events/:id/confirm` remains the app-side path (events-and-occurrences.md R-24).

## Screens and states

| Screen id | Screen | Route (mobile / web) | Primary actions | States |
|---|---|---|---|---|
| A01 | Admin sign-in | none / `/admin/sign_in` | Sign in with Google | not an admin, invalid token, rate limited |
| A02 | Dashboard | none / `/admin` | Open a section, open a filtered list | job failure highlighted, empty (fresh database) |
| A03 | Venues CRUD | none / `/admin/venues` | New, edit, search | empty, validation |
| A04 | Events CRUD | none / `/admin/events`, `/admin/events/:id/occurrences` | New, edit, Verify now, Confirm now, Re-materialize, occurrence edit, cancel, add, reset | empty, validation (rrule, host), claimed (host fields read-only), dormant, announced (no rows) |
| A05 | Clubs CRUD | none / `/admin/clubs`, `/admin/clubs/:id/memberships` | New, edit, hide, verify, add member, change role, remove | validation (single owner) |
| A06 | Sponsors CRUD | none / `/admin/sponsors` | New, edit, hide, verify | validation |
| A07 | CSV seed import | none / `/admin/seeds` | Upload and preview, Apply | preview, row errors, applied, too many rows |
| A08 | Users | none / `/admin/users` | Search, role, suspend, delete | self (role locked), suspended |
| A09 | Claim review | none / `/admin/claims` | Approve, Reject with note | empty, already claimed, contested (two pending) |
| A10 | Moderation queue | none / `/admin/reports` | Hide, remove, restore, warn, suspend, dismiss | empty, actioned |
| A11 | Spots CRUD and merge | none / `/admin/spots` | New, edit, merge | duplicate warning within 150 m |
| A12 | Jobs | none / `/admin/jobs` | Mission Control | provided by the engine |

## Copy

| Where | String |
|---|---|
| A01 headline | curb admin |
| A01 flash, not an admin | This Google account is not an admin. |
| A01 flash, invalid token | Couldn't verify that sign-in. Try again. |
| Flash, moderator on an admin page | That page needs the admin role. |
| Flash, signed out | Signed out. |
| A02 stale meets row | 14 unclaimed meets not confirmed in 30 days. 3 hidden after 90. |
| A02 job health, failed | MaterializeOccurrencesJob failed last night. Open Jobs. |
| Table empty, generic | Nothing here yet. |
| A04 host fields, claimed | Claimed by {host_name} on {date}. Host fields are locked; change ownership through a claim. |
| A04 Verify now confirm | Mark this meet verified and confirmed as of now? |
| A04 Re-materialize confirm | Rebuild occurrences for the next 90 days? Overridden dates are kept. |
| A04 occurrence cancel note placeholder | Why this date is off (shown to people who were going) |
| A04 announced empty | No dates yet. Add one when the host posts it. |
| A05 owner error | A club has exactly one owner. Transfer ownership by changing another member to owner first. |
| A07 preview heading | Preview: {create} to create, {update} to update, {skip} unchanged, {errors} errors. Nothing has been written. |
| A07 too many rows | Files are limited to 500 rows. Split the file. |
| A07 apply button | Apply {n} changes |
| A07 applied | Applied. {create} created, {update} updated, {skip} unchanged. |
| A08 role locked | You can't change your own role. |
| A08 suspend confirm | Suspend {handle}? Their sessions end now and they can't sign in. |
| A09 approve confirm | Set {host} as the host of {title}? Other pending claims on it will be rejected. |
| A09 already claimed | This meet was claimed by {host_name} on {date}. Reject or leave pending. |
| A09 auto-reject note | Another claim on this meet was approved. |
| A09 reject note placeholder | Shown to the claimant. Say what would help: a post from the organizer's account, a club calendar link. |
| A10 action recorded | Recorded: {action} on {type}. |
| A11 merge confirm | Merge {loser} into {survivor}? Photos move, the merged spot is removed. |

## Acceptance criteria

| Id | Given | When | Then | Proves |
|---|---|---|---|---|
| AC-1 | No session | Every GET route under `/admin` (route sweep) | 302 to `/admin/sign_in`; `GET /admin/sign_in` is 200 | R-9, R-30 |
| AC-2 | A session for a `member` user set directly in the test | The same sweep | 302 to `/admin/sign_in` on every route | R-9, R-30 |
| AC-3 | `Auth::GoogleTokenVerifier` stubbed to return claims for an `admin` identity, then for a `member`, then raising | `POST /admin/session` three times | 302 to `/admin` with a session cookie; 302 to `/admin/sign_in` with the not-an-admin flash and no cookie; 302 with the invalid-token flash and no cookie | R-7, R-8 |
| AC-4 | A signed-in moderator | `GET /admin/reports`, `GET /admin/claims`, `GET /admin/users`, then `GET /admin/venues` and `GET /admin/jobs` | 200, 200, 200, then 302 to `/admin` with the role flash twice | R-9, R-12 |
| AC-5 | A signed-in admin | `POST /admin/venues` without the CSRF token, then with it | 422 (`InvalidAuthenticityToken`), then 302 to the venue and one `admin_audits` row with `action` `create` and `changes.name` | R-5, R-1 |
| AC-6 | `GET /v1/health` and `PUT /v1/follows` with a token | Inspect headers | No `Set-Cookie` on either | R-5, R-31 |
| AC-7 | An event hosted by a club, edited in A04 to a different `rrule` | The form is submitted | `host_name` unchanged, `MaterializeOccurrencesJob` enqueued once, `dormant_at` null, an audit row whose `changes` contains `rrule` before and after | R-2, R-15 |
| AC-8 | A dormant unclaimed event | Verify now is clicked | `verified_at` and `last_confirmed_at` are now, `dormant_at` null, audit row `action` `verify` | R-16, R-2 |
| AC-9 | An `announced` event | An occurrence is added for next Saturday, then Re-materialize runs | One row with `overridden_at` set survives; a cancel with an empty note is rejected with a form error | R-17 |
| AC-10 | A claimed event | The edit form is rendered | `host_type` and host picker are disabled with the claimed copy; a crafted POST changing `host_id` is ignored and audited as `skipped_locked_fields` | R-15 |
| AC-11 | A club with one owner | A second membership is submitted with `role` `owner` in A05 | The form re-renders with the owner error; no row created | R-18 |
| AC-12 | A `clubs.csv` with 3 rows and a `sponsors.csv` with 2, then an `events.csv` referencing them | Uploaded in that order with preview then apply | Previews show 3, 2, and N creates and write nothing; after apply the rows exist; re-uploading each shows all `skip` and applies nothing; an `events.csv` with 501 rows is rejected with the too-many-rows copy | R-20, R-21 |
| AC-13 | An `events.csv` row with a bad `rrule` | Preview | The row shows `error` with the events-and-occurrences.md message and the Apply button count excludes it; apply writes the valid rows only | R-20 |
| AC-14 | A user with two sessions | Suspended in A08 by a moderator | `status` `suspended`, zero sessions, audit row; the moderator cannot see the role select; an admin editing their own role gets the locked copy and no change | R-3, R-22 |
| AC-15 | A user deleted in A08 | The action runs | `DELETE /me` semantics: `status` `deleted`, `deleted_at` set, `AccountDeletionJob` enqueued | R-4 |
| AC-16 | Two pending claims on one unclaimed event, one `claim_as` a user, one a club | The club claim is approved | `events.host_type` `Club`, `host_id`, `host_name`, `claimed_at` set, `dormant_at` null, the other claim `rejected` with the auto-reject note, `claim_approved` and `claim_rejected` notifications enqueued, one audit row; approving the rejected one afterwards fails with the already-claimed flash | R-23 |
| AC-17 | A reject with an empty note | Submitted | Form error; with a note, `status` `rejected`, `review_note` saved, `claim_rejected` enqueued | R-23 |
| AC-18 | Three open reports on one post | A10 lists the queue and `hide` is applied | One group row with count 3; after the action the post is `hidden`, three reports `actioned`, one `moderation_actions` row with `moderator_id`, one audit row; the allowed-actions list came from the policy object (spec stubs it to forbid `remove` and the button is absent) | R-24 |
| AC-19 | Two spots 40 m apart, the loser with 3 photos and 1 external media | Merge is submitted | Survivor has the 4 items and `photos_count` 4, loser `status` `removed` with 0, both ids in one audit row | R-25 |
| AC-20 | One IP | 11 `POST /admin/session` in a minute | The 11th is 429 | R-11 |
| AC-21 | A fresh database with seeds applied | `GET /admin` as admin | Counts match `Event.published.count` and friends, the three job rows show a last run, and the stale row links to `/admin/events?stale=1` | R-13 |
| AC-22 | An event at Victoria Gardens with `starts_at` `2026-11-07T15:30:00Z` | The occurrence list renders | The row shows `Sat Nov 7, 7:30 am PST` | R-27 |

## Verification

| Check | How |
|---|---|
| API | `pnpm --filter @curb/api test spec/requests/admin/` (`route_guard_spec.rb` for AC-1 and AC-2, `session_spec.rb`, `venues_spec.rb`, `events_spec.rb`, `occurrences_spec.rb`, `clubs_spec.rb`, `sponsors_spec.rb`, `seeds_spec.rb`, `users_spec.rb`, `claims_spec.rb`, `reports_spec.rb`, `spots_spec.rb`, `no_cookies_spec.rb`) with `sign_in_admin(user)` and `sign_in_moderator(user)` helpers that stub the verifier; `spec/models/admin_audit_spec.rb` |
| Rate limit | `spec/requests/rack_attack_spec.rb` (shared with auth-and-accounts.md) for AC-20 |
| Views | Request specs assert on rendered HTML with Capybara matchers (`have_button`, `have_select`); no system tests at launch. AC-5 sets `ActionController::Base.allow_forgery_protection = true` for its example, since the test environment disables it by default |
| Manual | On a laptop in Safari: sign in with the real Google client id on staging, upload `db/seeds/events.csv` in preview, apply, open Mission Control, sign out |
| Design | None; the admin uses `admin.css` (Geist, `border` hairlines, no brand review required) |

## Risks and open questions

- Adopted 2026-09-06 into docs/data-model.md: add `admin_audits` (`admin_id uuid FK users`, `action text`, `target_type text`, `target_id uuid`, `changes jsonb`, `ip inet`, `created_at`; index `(target_type, target_id, created_at DESC)` and `(admin_id, created_at DESC)`). `moderation_actions` covers moderation only; CRUD needs its own trail.
- Adopted 2026-09-06 into docs/screens.md: A01 moves to Phase 0, because A12 (`/admin/jobs`, Phase 0) needs a signed-in admin.
- Adopted 2026-09-06 into docs/api.md rate limits: add the three `/admin` limits in R-11.
- Gaps item 12 (moderation backup): a trusted host with the `moderator` role can work A09 and A10 without touching CRUD; R-9 keeps that boundary.
- Google Identity Services needs a separate OAuth web client id for the admin origin (`GOOGLE_ADMIN_CLIENT_ID`) and the API host's origin in the Google console; on `localhost:3000` use the same client with the localhost origin allowed.
- Mission Control's assets ship with the gem and expect Propshaft or Sprockets; Propshaft is enabled for this reason and must not be removed when trimming middleware.
- CSP: the admin layout allows `script-src` from self and `accounts.google.com`, `frame-src accounts.google.com`, and nothing inline; the API responses keep the strict default. If GIS One Tap misbehaves under CSP, fall back to the redirect-mode button.
- Audit `changes` for `description` and other long text are truncated at 2,000 chars; full history is not a goal.
- Deleting a venue with events is refused (FK); the form shows the events instead. Venue merge is not built; use A04 to repoint events by hand until it hurts.
- Uploads for A07 sit in R2 as ordinary blobs; purge them nightly after 24 hours with a small job so seed files do not accumulate.

## Session breakdown

| Slice | Deliverable | Covers | Must pass |
|---|---|---|---|
| 1 (Phase 0) | `Admin::BaseController`, middleware and Propshaft wiring, layout with nav and flash, `admin.css`, `admin.js`, A01 with GIS, `POST|DELETE /admin/session`, `admin:grant` task, rack-attack rules, Mission Control mount, `admin_audits` migration and `Admin::Auditable`, route sweep and no-cookie specs | R-1, R-5 to R-12, R-30, R-31 | AC-1 to AC-6, AC-20 |
| 2 (Phase 1) | Shared `_table`, `_form_errors`, `_field` partials, Pagy, A03 venues, A08 users (search, role, suspend, delete) | R-3, R-4, R-14, R-22, R-26, R-27 | AC-14, AC-15 |
| 3 (Phase 1) | A04 events form with host and venue pickers, sponsorships, Verify, Confirm, Re-materialize, claimed lock | R-2, R-15, R-16 | AC-7, AC-8, AC-10 |
| 4 (Phase 1) | A04 occurrences list and actions, A02 dashboard with counts, job health, and the consistency report | R-13, R-17 | AC-9, AC-21, AC-22 |
| 5 (Phase 1) | A05 clubs and memberships, A06 sponsors (clubs.md slice 3 and sponsors.md's admin slice) | R-18, R-19 | AC-11 |
| 6 (Phase 1) | A07 seeds: upload, blob storage, dry-run preview, apply, results; `Seeds::ClubRowImporter`, `SponsorRowImporter`, `VenueRowImporter`; upload purge job | R-20, R-21 | AC-12, AC-13 |
| 7 (Phase 2) | A09 claim review with the approval transaction and notifications | R-23 | AC-16, AC-17 |
| 8 (Phase 2) | A10 moderation queue reading the policy object from moderation-and-safety.md | R-24 | AC-18 |
| 9 (Phase 4) | A11 spots CRUD and merge | R-25 | AC-19 |

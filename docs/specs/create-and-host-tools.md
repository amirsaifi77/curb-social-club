# Spec: Create and host tools

Status: draft. Phase: 2. Last updated: 2026-09-06.
Depends on: events-and-occurrences.md (models, materializer), event-detail-and-rsvp.md (S08 layout, S10), clubs.md (club as host), admin.md (A09 claim review), notifications.md (`event_cancelled`, `claim_approved`, `claim_rejected`), auth-and-accounts.md (S26). Related decisions: ADR 0010, gaps items 4, 5, 7, 11.

## Summary

A signed-in user lists a meet by hand in under two minutes, as themselves or as a club they manage, with a schedule that covers every week in one listing. Hosts keep the listing honest with edit, a per-date cancel that sends one message to everyone going, and a "Still happening?" confirmation that keeps seeded and long-running meets from reading as stale (gaps items 4 and 5). Anyone who runs a seeded meet can claim it; review stays manual. Every screen renders flat under Liquid Glass and every string names the place and the time.

## User stories

| Id | Story |
|---|---|
| US-1 | As a member, I want to list a meet with a short form so that people within 20 miles can find it this weekend. |
| US-2 | As a host, I want to set a repeat rule (every Saturday, first Sunday) so that one listing covers every week. |
| US-3 | As a host, I want to edit my meet and have the upcoming dates update so that the listing stays correct. |
| US-4 | As a host, I want to cancel one date with a note so that everyone going hears it from me, once. |
| US-5 | As a host, I want to confirm my meet is still on so that the listing does not decay into "Unclaimed" or hidden. |
| US-6 | As a host, I want to claim the seeded listing of my meet, as myself or as my club, so that I can edit it. |
| US-7 | As a club admin, I want to post a meet as the club so that the card carries the club's name, not mine. |
| US-8 | As a member, I want to be told when the meet I am adding is already listed so that curb does not show it twice. |

## Scope

In Phase 2: the Create tab (S06) with two entries; the manual form (S20) with live preview, local autosave, validation, and offline handling; the recurrence and exceptions editor (S25); edit (S21) with re-materialization; host controls on S08 (edit, cancel a date through S22, confirm, who's going, cancel the meet); the claim sheet (S23) with pending, rejected, and resubmit states; the Pundit policies that define "host"; duplicate detection on manual create (Should).

Not in this phase: import from a link (import-from-link.md, Phase 3); editing sponsorships (admin-only, sponsors.md); the going list itself (event-detail-and-rsvp.md); pinned comments (Phase 4, photos-and-posts.md); server-side drafts and a Drafts list (Later); automated claim verification by code or email (Later); claiming a club (Phase 7); web create and edit (W17, Phase 7); the push and inbox rows produced by cancel and claim results (notifications.md).

## Requirements

**Data**

- R-1 A created event MUST write `events.host_type`, `host_id`, `host_name`, `created_by_id`, `venue_id`, `title`, `slug`, `dtstart`, `duration_minutes`, `timezone`, `tags`, `status`, `visibility`, `rsvp_mode`, and `published_at`, with `timezone` copied from `venues.timezone` when the client omits it. (US-1)
- R-2 A recurring event MUST store an RFC 5545 string in `events.rrule` and an optional `rrule_until`; a one-off MUST store `rrule` null. (US-2)
- R-3 The first published event with `host_type: User` MUST set `profiles.is_host` true for that user. (US-1)
- R-4 A `venue: { name, address, location }` payload MUST reuse an existing venue whose name has trigram similarity of at least 0.6 within 100 m, and MUST otherwise create one with `external_source: manual` and `created_by_id` set. (US-1)
- R-5 An occurrence override MUST set `event_occurrences.overridden_at`, and the materializer MUST never touch a row whose `overridden_at` is not null. (US-4)
- R-6 A claim MUST write `claim_requests` with `claim_as_type`, `claim_as_id`, `relationship`, optional `evidence_url`, and `status: pending`; approval MUST set `events.host_type`, `host_id`, `host_name`, and `claimed_at` in one transaction. (US-6)

**Authorization (Pundit)**

- R-7 `EventPolicy#host?` MUST return true only when `user.role == "admin"`, or `event.host_type == "User" && event.host_id == user.id`, or `event.host_type == "Club"` and an active `club_memberships` row exists for `(club_id: event.host_id, user_id: user.id)` with `role` in `owner`, `admin`; an event with `host_type: Sponsor` MUST resolve `host?` true for admins only. (US-3, US-7)
- R-8 `EventPolicy#update?`, `#destroy?`, and `#confirm?` MUST equal `#host?`; `#show?` MUST be true when `events.status` is `published` or `cancelled` and MUST otherwise equal `#host?`, so drafts return 404 to everyone else. (US-3)
- R-9 `EventPolicy#create?` MUST be true for any user with `users.status: active`, and when the body has `host.type: "club"` MUST additionally require an active `owner` or `admin` membership in that club. (US-1, US-7)
- R-10 `OccurrencePolicy#update?` MUST equal `EventPolicy#host?` for the occurrence's event. (US-4)
- R-11 `ClaimRequestPolicy#create?` MUST be true only when the user is active, `events.claimed_at` is null, `EventPolicy#host?` is false for that user, and, for `claim_as.type: "club"`, the user holds an active `owner` or `admin` membership in that club. (US-6)
- R-12 A user with `users.status: suspended` or `deleted` MUST fail every policy above, and every controller action in this spec MUST call `authorize` with `verify_authorized` enforced as an after action. (US-1 to US-7)
- R-13 The Event `viewer` shape MUST set `can_edit` from `#host?`, `can_claim` from `ClaimRequestPolicy#create?` with no pending claim by the viewer, and `claim_status` to `pending` when one exists. (US-3, US-6)

**API**

- R-14 `POST /events` MUST accept the body in `docs/api.md`, MUST validate per the table in the API section, MUST return 201 with the Event detail, and MUST materialize occurrences inline so the response already carries `upcoming_occurrences`. (US-1, US-2)
- R-15 `POST /events` SHOULD return 409 `conflict` with `details.duplicate_of` (EventSummary) when a published public event has a venue within 200 m and a `dtstart` within 60 minutes of the request, unless the body carries `force: true`. (US-8)
- R-16 `PATCH /events/:id` MUST accept a partial body and, when any of `dtstart`, `duration_minutes`, `timezone`, `rrule`, `rrule_until`, or `venue` changes, MUST re-materialize inline: upsert new dates, mark dates no longer in the rule `cancelled`, and leave overridden rows untouched. (US-3)
- R-17 `DELETE /events/:id` MUST set `events.status: cancelled`, MUST set every future `scheduled` occurrence to `cancelled`, MUST leave past occurrences untouched, and MUST enqueue the `event_cancelled` fan-out from notifications.md once. (US-4)
- R-18 `POST /events/:id/confirm` MUST set `events.last_confirmed_at` to now and return the Event detail. (US-5)
- R-19 `PATCH /occurrences/:id` MUST accept `starts_at`, `ends_at`, `status` in `scheduled` or `cancelled`, and `override_note` (140 chars), MUST set `overridden_at`, MUST return 422 for an occurrence whose `ends_at` has passed or whose status is `completed`, and MUST enqueue the `event_cancelled` fan-out when status changes to `cancelled`. (US-4)
- R-20 `POST /events/:id/claims` MUST create a pending claim and return 201 with ClaimRequest; MUST return 409 `conflict` with `details.reason` of `already_claimed` when `claimed_at` is set, `pending_claim` when the user already has one, or `resubmit_limit` when the user has two rejected claims on the event; MUST return 403 when `claim_as.type: "club"` without a manager membership; and MUST be rate limited to 5 per user per day. (US-6)
- R-21 `GET /me/events` MUST return events where `EventPolicy#host?` is true including drafts, and `GET /me/claims` MUST return the user's claims newest first. (US-3, US-6)

**Mobile**

- R-22 S06 MUST offer "Paste a link" (behavior in import-from-link.md, hidden behind the mobile build constant `FEATURES.import` until Phase 3) and "Add the details yourself" opening S20; a signed-out tap on either MUST open S26 and continue afterward. (US-1)
- R-23 S20 MUST render, in order, title; When (start, optional end); Repeats (opens S25); Where (venue search through `GET /venues/search` with existing venues listed above provider suggestions, an adjustable pin, and a parking note); What shows up (tag chips from `events.tags`); About; Photo (one image through `POST /uploads/direct`); Source link; Visibility; Post as; and the venue permission checkbox from gaps item 11. (US-1)
- R-24 The Post as selector MUST default to the user and MUST list only clubs from `GET /me/clubs` where `role` is `owner` or `admin` and `status` is `active`, and MUST be hidden when that list is empty. (US-7)
- R-25 A preview card at the top of S20 MUST be the same component the feed uses and MUST update on every change without a network call. (US-1)
- R-26 S20 MUST persist the form to local storage on every change (debounced 500 ms) under `draft.event.new` or `draft.event.<id>`, MUST restore it on the next open with a "Draft restored" banner and a Discard action, and MUST clear it on a successful post. (US-1)
- R-27 S20 MUST validate inline on blur and again on Post, MUST scroll to the first error, and MUST disable Post while offline with the offline banner shown. (US-1)
- R-28 On a 409 from R-15 the client MUST show the duplicate sheet with "Open it instead" (S08 for `duplicate_of`) and "List anyway" (retries with `force: true`). (US-8)
- R-29 S25 MUST offer Doesn't repeat, Every week, Every 2 weeks, Monthly on the nth weekday (derived from the start date), Custom (weekdays and interval), Seasonal (a rule plus a last date, gaps item 7), and Dates announced by the host (gaps item 7, Should, see Risks), MUST emit `rrule` and `rrule_until`, and MUST show a readable summary such as "Every Saturday". (US-2)
- R-30 In edit mode S25 MUST list the next eight occurrences from `GET /events/:id/occurrences` with per-row "Cancel this date" and "Change time" actions that call `PATCH /occurrences/:id`. (US-3, US-4)
- R-31 S21 MUST prefill from `GET /events/:slug`, MUST confirm before submitting a schedule change, MUST show the "Updating dates" state while the PATCH is in flight, and MUST return to S08 refreshed on success. (US-3)
- R-32 When `viewer.can_edit` is true S08 MUST show a Host tools row with Edit (S21), Cancel a date (S22), Who's going (S10), and Cancel this meet (confirmation, then `DELETE /events/:id`). (US-3, US-4)
- R-33 When `viewer.can_edit` is true and `last_confirmed_at` (or `published_at` when null) is older than 30 days, S08 MUST show the "Still happening?" card whose Yes action calls `POST /events/:id/confirm`. (US-5)
- R-34 S22 MUST default to the next scheduled occurrence, MUST offer Cancel this date with a note, Change time for this date only, and Restore this date, and MUST state how many going people will be messaged before the host confirms. (US-4)
- R-35 S08 MUST show "Are you the host? Claim this meet." when `viewer.can_claim` is true, and S23 MUST collect Claim as (self or a managed club), relationship (20 to 500 chars), optional evidence URL, and the venue permission checkbox, then call `POST /events/:id/claims`. (US-6)
- R-36 S23 MUST render pending (requester only), rejected with `review_note` and one Send again, second rejection (no resubmit), already claimed, and rate limited states from `viewer.claim_status`, `GET /me/claims`, and the 409 reasons. (US-6)
- R-37 After a user's first successful post the client MUST show the host welcome sheet once, then the success sheet with Share and Done. (US-1)

**Web**

- R-38 None beyond reading: web create and edit are W17 in Phase 7, and the Unclaimed and Claimed labels on W03 belong to web.md. (US-6)

**Admin and jobs**

- R-39 A09 (admin.md) MUST approve or reject with a `review_note`, MUST flag an event with two or more pending claims as contested, and approval MUST run the transaction in R-6 and set `profiles.is_host` for a User claim. (US-6)
- R-40 Approval and rejection MUST enqueue `claim_approved` or `claim_rejected` (notifications.md) exactly once per review. (US-6)

## Data

Writes: `events` (all columns in R-1 plus `rrule`, `rrule_until`, `description`, `cover`, `source_url`, `capacity`, `claimed_at`, `last_confirmed_at`), `venues` (create on manual entry), `event_occurrences` (materialized rows, `status`, `overridden_at`, `override_note`), `claim_requests`, `profiles.is_host`. Reads: `club_memberships` for R-7, R-9, R-11, R-24. Columns adopted into the data model on 2026-09-06 (see Risks): `events.parking_note`, `events.cadence`, `claim_requests.venue_permission_confirmed`.

## API

Uses `POST /events`, `PATCH /events/:id`, `DELETE /events/:id`, `POST /events/:id/confirm`, `GET /events/:id/occurrences`, `PATCH /occurrences/:id`, `POST /events/:id/claims`, `GET /me/events`, `GET /me/claims`, `GET /me/clubs`, `GET /venues/search`, `POST /uploads/direct`, `GET /events/:slug`.

Validation for `POST /events` and `PATCH /events/:id` (422 `validation_failed`, keys in `details`):

| Field | Rule |
|---|---|
| `title` | 3 to 80 chars |
| `dtstart` | Required unless `cadence: announced`; not more than 15 minutes in the past; at most 366 days ahead |
| `duration_minutes` | 15 to 1440; default 180 when the client sends no end |
| `venue` | `{ id }` of an existing venue, or `{ name, address, location }` with `location` inside a valid lat and lng range |
| `rrule` | Parseable by `ice_cube`; `FREQ` in `WEEKLY`, `MONTHLY`; `rrule_until` after `dtstart` when present |
| `tags` | Subset of the `events.tags` list; default `["all"]` |
| `description` | Up to 2000 chars |
| `source_url` | `http` or `https` URL, 2048 chars, when present |
| `visibility` | `public` or `unlisted`; `rsvp_mode` defaults to `open` |
| `host` | `{ type: "user" }` or `{ type: "club", id }` (R-9); `{ type: "sponsor", id }` is 403 `not_enabled` until sponsor self-service (sponsors.md R-10); anything else 422 |
| `force` | Boolean, only read on `POST` (R-15) |

Deltas this spec assumes (Risks): `details.duplicate_of` on the 409 from `POST /events`; `details.reason` on the 409 from `POST /events/:id/claims`; `parking_note` and `venue_permission_confirmed` in the create body.

## Screens and states

| Screen id | Screen | Route (mobile / web) | Primary actions | States |
|---|---|---|---|---|
| S06 | Create (tab) | `(tabs)/new` / `/new` (7) | Paste a link (3), Add the details yourself | signed-out, offline |
| S20 | Manual create form | `meets/new` / `/new` (7) | Post event | validation, draft saved, draft restored, offline, duplicate found, posting, error, success |
| S25 | Recurrence and exceptions editor | `meets/[slug]/schedule` / none | Pick a rule, cancel a date, change time | loading (edit mode dates), error |
| S21 | Edit event | `meets/[slug]/edit` / none | Save | loading, validation, schedule change confirm, re-materialization pending, error, offline |
| S22 | Occurrence override sheet | sheet in `meets/[slug]` / none | Cancel this date, Change time, Restore | confirm, error, offline |
| S23 | Claim sheet | `meets/[slug]/claim` / none | Send claim | signed-out, pending, rejected, resubmit limit, already claimed, rate limited, error |
| S08 | Event detail (host tools row and claim entry only) | `meets/[slug]` / `/meets/:slug` | Host tools, Still happening?, Claim | see event-detail-and-rsvp.md |

## Copy

| Where | String |
|---|---|
| S06 title | Add a meet |
| S06 entry, import | Paste a link. Evite, Eventbrite, Meetup, or any public page. |
| S06 entry, manual | Add the details yourself. About two minutes. |
| S06 offline | You're offline. You can still write a draft. Posting waits for a connection. |
| S20 nav title, CTA | New meet, Post event |
| S20 title placeholder | Saturday cars and coffee at Back Bay |
| S20 When labels | Starts, Ends (optional) |
| S20 Repeats row, default | Doesn't repeat |
| S20 Where placeholder | Search for a lot, cafe, or address |
| S20 pin action | Adjust the pin |
| S20 parking placeholder | Parking note. Lot behind the bakery, not the street. |
| S20 tags header | What shows up |
| S20 About placeholder | What to expect. Coffee is inside, wagons welcome, ends when the lot fills. |
| S20 photo helper | Add a photo from last time. Overcast is fine. |
| S20 source helper | If this meet lives on Evite or Instagram, link it. We credit the source. |
| S20 visibility | Public: on the map and in search. Unlisted: only people with the link. |
| S20 Post as options | You (@handle), then club names |
| S20 permission checkbox | I have permission to hold this meet at this location. |
| S20 validation, title | Give it a name, 3 to 80 characters. |
| S20 validation, start | Pick a start time that hasn't passed. |
| S20 validation, end | The end needs to be after the start. |
| S20 validation, place | Pick a place or drop a pin. |
| S20 validation, link | That link doesn't look right. Include https://. |
| S20 validation, permission | Confirm you have permission to use the location. |
| S20 draft restored | Draft restored from earlier. (Discard) |
| S20 offline | You're offline. Your draft is saved on this phone. |
| S20 posting, error | Still posting / Couldn't post. Your draft is saved. |
| S20 duplicate sheet | Already listed? {title} at {venue}, {day} {time}, is on curb already. (Open it instead / List anyway) |
| S20 success | Listed. People within 20 miles can see it now. (Share / Done) |
| S20 host welcome (first post) | Thanks for hosting. Your meet is listed and people nearby can see it now. A few things that help: post the exact lot, not just the street. Say when the coffee runs out. Add a photo from last time, overcast is fine. If the meet moves or cancels, change it here and everyone who is going gets one message, from you, with your name on it. |
| S25 options | Doesn't repeat, Every week, Every 2 weeks, Monthly on the {nth} {weekday}, Custom, Seasonal, Dates announced by the host |
| S25 summaries | Every Saturday / Every other Saturday / First Sunday of the month / Every Saturday until Oct 31 / Dates announced by the host |
| S25 seasonal label | Last date |
| S25 announced helper | No dates yet. Add each one when you announce it. |
| S25 dates header, actions | Upcoming dates, Cancel this date, Change time |
| S21 nav title, CTA | Edit meet, Save |
| S21 schedule confirm | Changing the schedule updates the upcoming dates. Dates you changed by hand stay as they are. (Update dates / Keep editing) |
| S21 pending | Updating dates |
| S08 host tools row | Host tools: Edit, Cancel a date, Who's going, Cancel this meet |
| S08 still happening | Still happening? Last confirmed {Mon D}. (Yes, still on / Edit) |
| S08 confirmed toast | Confirmed. Thanks. |
| S08 cancel meet confirm | Cancel this meet? Upcoming dates are cancelled and everyone going gets one message from you. (Cancel the meet / Keep it) |
| S22 title | {Weekday}, {Mon D} |
| S22 note placeholder | Note for everyone going. Rain, lot closed, moved to 8. |
| S22 footer | {n} people going get one message, from you. |
| S22 actions | Cancel this date, Change time for this date only, Restore this date |
| S22 done toast | Cancelled {Sat, Oct 4}. {n} people notified. |
| S08 claim entry | Are you the host? Claim this meet. |
| S23 title, CTA | Claim this meet, Send claim |
| S23 claim as | Claim as: You (@handle), then club names |
| S23 relationship | How are you connected to this meet? (I organize it every Saturday with two friends.) |
| S23 evidence | Where can we check? Optional. (Instagram, club calendar, or website) |
| S23 footer | We review claims by hand, usually within a few days. |
| S23 pending | Claim under review. We'll let you know. |
| S23 rejected | We couldn't approve this claim. {review_note} (Send again) |
| S23 resubmit limit | This claim was reviewed twice. Email hello@curbsocial.club if that seems wrong. |
| S23 already claimed | This meet already has a host. |
| S23 rate limited | That's enough claims for today. Try again tomorrow. |

## Acceptance criteria

| Id | Given | When | Then | Proves |
|---|---|---|---|---|
| AC-1 | A signed-in member and an existing venue | `POST /events` with a one-off body and `host: { type: "user" }` | 201, `slug` ends in a 6 char suffix, `host_name` is the display name, `timezone` equals the venue's, one `scheduled` occurrence, `published_at` set, `profiles.is_host` true | R-1, R-3, R-14 |
| AC-2 | The same member | `POST /events` with `rrule: FREQ=WEEKLY;BYDAY=SA` | 201 with four `upcoming_occurrences`, 13 `scheduled` rows inside the 90-day horizon, and `rrule_text` "Every Saturday" | R-2, R-14 |
| AC-3 | A venue "Back Bay Coffee" 40 m from the payload | `POST /events` with `venue: { name: "Back Bay Coffee Co", address, location }` | The event reuses the existing `venue_id`; no venue row is created | R-4 |
| AC-4 | A body with a 2 char title, a start yesterday, and `rrule: FREQ=DAILY` | `POST /events` | 422 with `details` keys `title`, `dtstart`, `rrule` | R-14 |
| AC-5 | A published public event at the same venue starting 30 minutes earlier | `POST /events` without `force`, then with `force: true` | 409 with `details.duplicate_of.slug`, then 201 | R-15 |
| AC-6 | An event hosted by club X; users A (no membership), B (admin of X), C (member of X), D (suspended admin of X) | `PATCH /events/:id { title }` as each | 403, 200, 403, 403 | R-7, R-9, R-12 |
| AC-7 | A weekly event with one overridden occurrence (note "back lot") | `PATCH /events/:id { rrule: "FREQ=WEEKLY;BYDAY=SU" }` | Saturday rows are `cancelled` except the overridden one, which keeps its note and status; Sunday rows exist through the 90-day horizon | R-5, R-16 |
| AC-8 | An event with two past and three future occurrences and two going RSVPs | `DELETE /events/:id` | `status: cancelled`, three future rows `cancelled`, past rows unchanged, one `event_cancelled` fan-out job enqueued | R-17 |
| AC-9 | A host and their event with `last_confirmed_at` 45 days ago | `POST /events/:id/confirm` | `last_confirmed_at` within 1 s of now; a non-host gets 403 | R-8, R-18 |
| AC-10 | A scheduled occurrence next Saturday | `PATCH /occurrences/:id { status: "cancelled", override_note: "Rain" }` then the materializer runs | `overridden_at` set, status stays `cancelled`, note kept, one `event_cancelled` fan-out enqueued | R-5, R-10, R-19 |
| AC-11 | An occurrence that ended yesterday | `PATCH /occurrences/:id { status: "cancelled" }` | 422 | R-19 |
| AC-12 | An unclaimed seeded event and a member | `POST /events/:id/claims` twice; then once on a claimed event; then `claim_as: { type: "club", id }` without membership | 201 pending; 409 `pending_claim`; 409 `already_claimed`; 403 | R-11, R-20 |
| AC-13 | A member with one rejected claim, then two | `POST /events/:id/claims` | 201 after one rejection; 409 `resubmit_limit` after two | R-20, R-36 |
| AC-14 | A pending User claim | A09 approves it | `events.host_type: User`, `host_id`, `host_name`, `claimed_at` set in one transaction; `profiles.is_host` true; one `claim_approved` job enqueued | R-6, R-39, R-40 |
| AC-15 | A draft event | `GET /events/:slug` anonymous, then as the host | 404, then 200 with `viewer.can_edit: true` | R-8, R-13 |
| AC-16 | S20 on device with airplane mode on, title and place filled | The app is killed and reopened, then airplane mode is turned off | The offline banner showed and Post was disabled; the draft is restored with the banner; Post enables | R-26, R-27 |
| AC-17 | S20 on device with a Saturday start | S25 picks Every week | The Repeats row reads "Every Saturday" and the preview card shows the recurring badge | R-25, R-29 |
| AC-18 | S08 on device as the host of a weekly meet with 3 going | S22 cancels next Saturday with the note "Rain" | S08 shows the cancelled banner with the note, the date is dimmed in the List, the toast names 3 people | R-32, R-34 |
| AC-19 | S08 on device, signed out, on an unclaimed event | The claim entry is tapped | S26 opens; after sign-in S23 opens with Claim as defaulting to the user | R-35, signed-out state |
| AC-20 | S20 on device as an owner of one club | The Post as row is opened | It lists You and the club; a user with no manager membership sees no Post as row | R-24 |

## Verification

| Check | How |
|---|---|
| API | `pnpm --filter @curb/api test spec/requests/api/v1/events_spec.rb spec/requests/api/v1/occurrences_spec.rb spec/requests/api/v1/claims_spec.rb spec/policies/event_policy_spec.rb spec/policies/occurrence_policy_spec.rb spec/policies/claim_request_policy_spec.rb spec/services/venue_matcher_spec.rb` |
| Materializer interplay | `spec/services/materialize_occurrences_spec.rb` (owned by events-and-occurrences.md) extended with AC-7 and AC-10 |
| Mobile | Manual on a physical iPhone in Marine Layer light and Harbor dark: AC-16 to AC-20. Maestro flows `create_manual.yaml`, `host_cancel_date.yaml`, `claim.yaml` once flows exist |
| Design | Figma page "iOS Screens", frames "Create", "Schedule", "Claim" (Phase 2 design pass); flat rendering check per design-system-and-theming.md |

## Risks and open questions

- Adopted 2026-09-06 into docs/data-model.md: add `events.parking_note` (text, 200 chars). The app overview shows a parking note on the form and the detail, and no column holds it.
- Adopted 2026-09-06 into docs/data-model.md and docs/api.md: gaps item 7 cadences. Add `events.cadence` (`once`, `weekly`, `monthly`, `seasonal`, `announced`, default `once`, as defined in events-and-occurrences.md), make `dtstart` nullable only when `cadence: announced`, and add `POST /events/:id/occurrences { starts_at, ends_at }` (host) that inserts an overridden occurrence so the materializer leaves it alone. Seasonal needs no new column (`rrule` plus `rrule_until`). Seasonal and announced exist at the model level from Phase 1; the announced UI is a Should in slice 8.
- Adopted 2026-09-06 into docs/data-model.md: add `claim_requests.venue_permission_confirmed` (boolean) and `events.venue_permission_confirmed_at` (timestamptz) per gaps item 11.
- Adopted 2026-09-06 into docs/api.md: `POST /events` returns 409 with `details.duplicate_of` (EventSummary) and accepts `force: true`, mirroring `POST /spots`; `POST /events/:id/claims` returns `details.reason` on 409.
- A moved date sends nothing in Phase 2 (only `event_cancelled` exists there); `event_updated` was added to `notifications.kind` on 2026-09-06 and ships in Phase 4, owned by notifications.md.
- The app overview prompts "Still happening?" at 60 days; gaps item 5 decays seeds at 30. Default: 30 days for the host card here; events-and-occurrences.md owns the decay thresholds.
- Seeded events carry the app account as host (clubs.md risk). Default: `viewer.can_claim` is true only when `claimed_at` is null, which covers seeds and imports.
- Re-materialization inline on PATCH is safe because the 90-day horizon yields at most 13 or 14 rows for a weekly rule and `FREQ=DAILY` is rejected anyway.

## Session breakdown

| Slice | Deliverable | Covers | Must pass |
|---|---|---|---|
| 1 | Pundit policies, `verify_authorized`, `viewer` fields, `POST`, `PATCH`, `DELETE`, `confirm` on events with validation table and inline materialization, rswag specs | R-1 to R-3, R-7 to R-9, R-12 to R-14, R-16 to R-18, R-21 | AC-1, AC-2, AC-4, AC-6 to AC-9, AC-15 |
| 2 | Venue matcher, duplicate detection with `force`, `PATCH /occurrences/:id` with override rules, `parking_note` and permission columns | R-4, R-5, R-10, R-15, R-19 | AC-3, AC-5, AC-10, AC-11 |
| 3 | Claims: model, policy, `POST /events/:id/claims`, `GET /me/claims`, approval and rejection service with the transaction and notification hooks, A09 contested flag (with admin.md) | R-6, R-11, R-20, R-39, R-40 | AC-12 to AC-14 |
| 4 | S06 and S20: form sections, venue search, pin, direct upload, tags, Post as, permission, preview card, autosave, validation, offline, duplicate sheet, success and welcome sheets | R-22 to R-28, R-37 | AC-16, AC-17 (form part), AC-20 |
| 5 | S25: rule picker, `rrule` builder and summary, seasonal, exceptions list in edit mode | R-29, R-30 | AC-17 |
| 6 | S21 edit with schedule confirm and pending state; S08 Host tools row, Still happening card, cancel meet; S22 sheet | R-31 to R-34 | AC-18 |
| 7 | S23 claim sheet with all states, claim entry on S08, Claims row under Me | R-35, R-36 | AC-19 |
| 8 (Should) | Announced cadence in the UI: `POST /events/:id/occurrences`, the S25 option, "Add a date" on S08 (the column, nullable `dtstart`, and materializer rules shipped in Phase 1, events-and-occurrences.md slice 1) | R-29 (announced) | Request spec for the new endpoint; manual add-a-date on device |

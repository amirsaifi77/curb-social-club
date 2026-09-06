# Spec: Event detail and RSVP

Status: draft. Phase: 1 (detail, directions, share sheet), 2 (RSVP, going list, occurrence detail, story card), 4 (photos and comments light up). Last updated: 2026-09-06.
Depends on: events-and-occurrences.md (Event and Occurrence shapes, confirmation), discovery.md (cards that open S08), sponsors.md (sponsorship data rules), profiles-and-follow.md (Follow, blocks), create-and-host-tools.md (claim, host controls), design-system-and-theming.md (primary CTA). Related decisions: ADR 0010, ADR 0011, gaps items 2, 4, 5, 29.

## Summary

The event page is everything a person needs to decide to go and to get there: when, where, who runs it, who else is going, and where the listing came from. It works for anyone without an account, gets directions in one tap, and shares a canonical web link that unfurls. RSVP is soft interest attached to one occurrence, never a gate. The screen is flat content under a transparent system header, with one accent button.

## User stories

| Id | Story |
|---|---|
| US-1 | As a browser, I want to open a meet from a card, a pin, or a link and see the next dates, the lot, and the host so that I can decide in under a minute. |
| US-2 | As a browser, I want directions in Apple Maps and an add-to-calendar action so that getting there needs no typing. |
| US-3 | As a browser, I want to see whether a listing is claimed and when it was last confirmed so that I trust the schedule, or know to check the source. |
| US-4 | As a member, I want to mark myself going or interested to one date, optionally with the car I'm bringing, so that the host and other regulars see who is coming. |
| US-5 | As a member, I want to see who is going so that I recognize people at the lot. |
| US-6 | As anyone, I want to share a meet to iMessage or an Instagram story so that friends can find it without the app. |
| US-7 | As a host, I want a "Still happening?" prompt on my own recurring meet so that the "Last confirmed" date stays current in one tap. |

## Scope

In Phase 1: S08 with all blocks, the source attribution card, directions, add to calendar, cancelled banner, unlisted token handling, the "no longer listed" page, share through the system share sheet with the canonical URL, Universal Link handling into S08 and S09, placeholders for photos and comments.

In Phase 2: `PUT` and `DELETE /occurrences/:id/rsvp` with going and interested and optional vehicle, the "I'm going" primary CTA, offline queue, S09 occurrence detail, S10 going list, Follow on the host block, the claim entry into S23, the host "Still happening?" prompt, S34 story card.

In Phase 4: photos grid and comments render real content (photos-and-posts.md).

Not in this spec: web pages W03 and W04 (web.md), the claim sheet and host controls (create-and-host-tools.md), Follow mechanics (profiles-and-follow.md), the OG image route (web.md), push reminders (notifications.md), report and block (moderation-and-safety.md).

## Requirements

**Data**

- R-1 An RSVP MUST attach to `event_occurrences`, never to `events`, with one row per `(user_id, event_occurrence_id)` and `status` in `going`, `interested`, `not_going`; `vehicle_id` MUST belong to the same user. (US-4)
- R-2 `going_count` and `interested_count` on `event_occurrences` MUST be counter caches updated in the same transaction as the RSVP write. (US-4, US-5)
- R-3 A `viewer.rsvp` of `going` or `interested` MUST be returned on Event, Occurrence, and EventSummary `next_occurrence` payloads for a signed-in viewer and null otherwise. (US-4)

**API**

- R-4 `GET /events/:slug` MUST work without a token, MUST return the Event detail shape with `upcoming_occurrences` (next 4), `sponsorships` ordered by `position`, `viewer`, and `claimed`; a draft MUST return 404 unless the viewer can edit. (US-1)
- R-5 `GET /events/:slug` for an `unlisted` event MUST return 404 unless the request carries a valid `token` query parameter (HMAC of the event id, generated on share) or the viewer can edit; an unlisted event MUST never appear in feed, map, list, search, or sitemap. (US-6)
- R-6 A `cancelled` or admin-hidden event MUST return 410 with code `gone` and a `nearby` array of up to three EventSummary rows when `near` is passed. (US-1)
- R-7 `PUT /occurrences/:id/rsvp` MUST upsert `{ status, vehicle_id? }`, MUST be idempotent, MUST return the Occurrence with the new counts, and MUST return 409 `occurrence_cancelled` when the occurrence is cancelled or 422 when `starts_at` is more than 2 hours in the past. (US-4)
- R-8 `DELETE /occurrences/:id/rsvp` MUST remove the row and MUST return 204 even when no row exists. (US-4)
- R-9 `GET /occurrences/:id/attendees` MUST list `going` first then `interested`, as MiniProfile with `status` and optional `vehicle` summary, paginated, excluding users blocked by or blocking the viewer. (US-5)
- R-10 `POST /events/:id/confirm` MUST require the host and MUST set `last_confirmed_at` to now. (US-7)

**Mobile**

- R-11 S08 MUST render blocks in this order: cover with the title on a `scrim` under a transparent header; when; where; host; sponsors (only when `sponsorships` is non-empty); going; about; source (only when `source` is present); photos; comments. (US-1)
- R-12 The when block MUST show the next occurrence in the venue timezone, `rrule_text` for recurring events, the next four dates as rows that open S09, and an "Add to calendar" action that writes one calendar event (recurring rule included) through `expo-calendar` after permission. (US-1, US-2)
- R-13 The where block MUST show a static map snippet, the full address, `parking_note` when present, and a "Directions" action that opens Apple Maps with the venue coordinates and name. (US-2)
- R-14 The host block MUST render the one `Host` shape (avatar, name, verified badge, `kind` label for sponsors) with a tap to S11, S12, or S14 by `type`, a Follow button (Phase 2), the "Claimed" label when `claimed` is true, and the unclaimed treatment with "Are you the host? Claim this meet." leading to S23 when `claimed` is false and `viewer.claim_status` is null; when the event has `external_host_name` the block MUST show it beside the app account host. (US-3)
- R-15 The sponsors block MUST list each sponsorship with the role label from `role` (`presented_by` "Presented by", `coffee` "Coffee by", `vendor` "Vendor", `partner` "Partner"), the `note`, and a tap to S14. (US-1)
- R-16 The going block MUST show `going_preview` avatars, "N going" and "M interested" counts, and the primary CTA "I'm going" using the states in `docs/components/primary-cta.md`, with a secondary "Interested" toggle; the counts row opens S10. (US-4, US-5)
- R-17 Tapping "I'm going" signed out MUST open S26 and complete the RSVP after sign-in; offline MUST show the Queued state and retry with backoff until online, then reconcile; a cancelled occurrence MUST show Disabled with "Cancelled" and a past one "Ended". (US-4)
- R-18 S08 MUST show "Last confirmed <date>" in the when block whenever `last_confirmed_at` is older than 30 days, and MUST show the host-only "Still happening?" prompt with a "Yes, still on" action calling `POST /events/:id/confirm` when `viewer.can_edit` is true and `last_confirmed_at` is older than 30 days (the same clock as `stale`). (US-3, US-7)
- R-19 A cancelled next occurrence MUST show a solid banner with the `override_note` and the CTA disabled; the source card MUST read "Originally posted on <source> by <handle>" and link out in the system browser; the photos and comments blocks MUST show their Phase 4 placeholder copy until those specs ship. (US-1, US-3)
- R-20 A 410 or 404 response MUST render the "no longer listed" page with the nearby meets returned in the body, keeping the navigation chrome. (US-1)
- R-21 S09 MUST show one occurrence with its date, override note, counts, going preview, and the same CTA, and MUST mark past occurrences with "Ended". (US-4)
- R-22 S10 MUST list attendees in two groups with vehicle lines ("Bringing a 1987 911") and MUST paginate. (US-5)
- R-23 Share MUST open the system share sheet with the canonical URL `https://curbsocial.club/meets/:slug` (plus `?token=` for unlisted events), MUST share the event URL when the current occurrence is cancelled, and MUST offer "Share to story" opening S34. (US-6)
- R-24 S34 MUST preview a 9:16 card fetched from `GET /og/meets/:slug.png?format=story` (server-rendered, flat editorial layout: cover, serif title, thin rule, date, venue, QR to the web URL), MUST never include Instagram media, and MUST save to Photos or share the image through the share sheet. (US-6)
- R-25 Universal Links and `curb://meets/:slug` and `curb://occurrences/:id` MUST open S08 or S09 directly, with the loading skeleton until the fetch resolves. (US-1)

**Web**

- R-26 None here; W03 and W04 are specified in web.md, including OG tags, JSON-LD, and the deep-link buttons.

**Admin and jobs**

**Check-in (Phase 4)**

- R-28 `POST /occurrences/:id/check_in` MUST require a user, MUST accept an optional `location`, MUST be allowed only from one hour before `starts_at` to two hours after `ends_at` (409 `check_in_closed` otherwise), and MUST be idempotent per user and occurrence. (US-4)
- R-29 When `location` is present the server MUST compute `distance_bucket` in PostGIS (`on_site` within 500 m, `nearby` within 5 km, else `remote`), set `verified` true only for `on_site`, and MUST NOT persist the coordinates; without `location` the bucket is `unknown`. (US-4)
- R-30 S08 and S09 MUST show a "I'm here" action during the check-in window when the device is within 500 m, MUST list checked-in people separately from RSVPs with a count from `check_in_count`, and MUST request precise location only at the moment of check-in. (US-4)

- R-27 None; cancellation and confirmation jobs live in events-and-occurrences.md and notifications.md.

## Data

Reads: `events` (all display columns, `claimed_at`, `last_confirmed_at`, `source_url`, `source_type`, `external_host_name`, `visibility`, `status`), `event_occurrences` (`starts_at`, `ends_at`, `status`, `override_note`, `going_count`, `interested_count`), `venues`, `event_sponsorships` with `sponsors`, `profiles` (going list), `vehicles` (RSVP vehicle), `blocks`. Writes: `rsvps` (`user_id`, `event_occurrence_id`, `status`, `vehicle_id`), `events.last_confirmed_at` through confirm. Migration: the Phase 2 RSVP slice of this spec creates `rsvps`; the Phase 4 check-in slice creates `check_ins`.

## API

Read: `GET /events/:slug` (with `token`, `near`), `GET /occurrences/:id`, `GET /occurrences/:id/attendees`, `GET /events/:id/occurrences`. Write (Phase 2): `PUT /occurrences/:id/rsvp`, `DELETE /occurrences/:id/rsvp`, `POST /events/:id/confirm`, `PUT /follows` with `followable_type: Event` or the host type (profiles-and-follow.md). Web resource (Phase 2): `GET /og/meets/:slug.png?format=story` served by the web app (web.md owns the route; this spec owns the story layout).

Deltas adopted into docs/api.md on 2026-09-06 (see Risks): `token` on `GET /events/:slug`; 410 with `nearby` on gone events; 409 `occurrence_cancelled`; `status` and `vehicle` on attendees; `format=story` on the OG route.

## Screens and states

| Screen id | Screen | Route (mobile / web) | Primary actions | States |
|---|---|---|---|---|
| S08 | Event detail | `meets/[slug]` / `/meets/:slug` | I'm going (2), Interested (2), Directions, Add to calendar, Share, host chip, Follow (2), Claim (2), source link, date rows | loading (skeleton with cover), error, offline (cached, CTA queued), signed-out on CTA and Follow, cancelled, unclaimed, unlisted, no longer listed, host view (Still happening?) |
| S09 | Occurrence detail | `occurrences/[id]` / `/meets/:slug/:occurrenceId` | I'm going, Interested, Directions, Share, going row | loading, error, offline, cancelled, past |
| S10 | Going list | `occurrences/[id]/going` / none | Open a profile | loading, empty, error, offline |
| S34 | Story card preview | sheet / none | Save image, Share | rendering, error |
| S26 | Sign-in sheet (used) | `sign-in` / none | Sign in with Apple, Google | owned by auth-and-accounts.md |

## Copy

| Where | String |
|---|---|
| S08 when, recurring | Every Saturday, 7:30 to 10 am |
| S08 when, next dates header | Next dates |
| S08 when, last confirmed | Last confirmed Jul 12 |
| S08 when, add to calendar | Add to calendar |
| S08 calendar permission denied | Calendar access is off. Turn it on in Settings to add this meet. |
| S08 where, directions | Directions |
| S08 where, parking | Parking: lot behind the bakery. Street is fine after 8. |
| S08 host, claimed | Claimed |
| S08 host, unclaimed | Unclaimed. Are you the host? Claim this meet. |
| S08 host, claim pending (own) | Claim under review |
| S08 host, external | Listed from a post by @backbayaircooled |
| S08 sponsors header | Sponsors |
| S08 sponsor roles | Presented by, Coffee by, Vendor, Partner |
| S08 going counts | 42 going. 8 interested. |
| S08 going, zero | Nobody has said they're going yet. |
| S08 CTA | I'm going, Going, Try again, Cancelled, Ended |
| S08 CTA secondary | Interested, Interested (on) |
| S08 CTA leave confirm | Not going anymore? |
| S08 CTA leave actions | Not going, Keep me going |
| S08 CTA queued caption | Saved on this phone. Will sync when you're back online. |
| S08 CTA error caption | Couldn't save. Check your connection. |
| S08 sign-in sheet lead | Sign in to mark yourself going, post photos, and follow hosts. Browsing is always free. |
| S08 cancelled banner | Cancelled this week. Host note: rain. |
| S08 cancelled banner, no note | Cancelled this week. |
| S08 still happening (host) | Still happening? Last confirmed Jul 12. |
| S08 still happening action | Yes, still on |
| S08 about header | About |
| S08 source card | Originally posted on Instagram by @backbayaircooled. |
| S08 source action | Open the original |
| S08 photos placeholder, upcoming | Photos go here after the meet. |
| S08 photos placeholder, past | No photos from this one yet. Were you there? |
| S08 comments placeholder | Comments open soon. Ask the host on their page for now. |
| S08 no longer listed | This meet is no longer listed. |
| S08 no longer listed, nearby header | Nearby this weekend |
| S08 error | Couldn't load this meet. Try again. |
| S08 offline | Showing a saved copy. |
| S09 past | Ended |
| S10 groups | Going, Interested |
| S10 vehicle line | Bringing a 1987 911 |
| S10 empty | Nobody yet. You could be first. |
| Share sheet, message text | Back Bay Coffee, Sat 7:30 am. https://curbsocial.club/meets/back-bay-coffee-a1b2c3 |
| S34 title | Share to story |
| S34 actions | Save image, Share |
| S34 error | Couldn't make the card. Try again. |

## Acceptance criteria

| Id | Given | When | Then | Proves |
|---|---|---|---|---|
| AC-1 | A published recurring event with two sponsorships and six future occurrences | `GET /events/:slug` without a token | 200, `upcoming_occurrences` has 4, `sponsorships` ordered by `position`, `viewer` all null or false, `claimed` false when `claimed_at` is null | R-4 |
| AC-2 | An `unlisted` published event | `GET /events/:slug`, then with a valid `token`, then `GET /feed` and `GET /events/map` around its venue | 404, then 200, and the event is absent from both lists | R-5 |
| AC-3 | A `cancelled` event and two scheduled events within 10 km | `GET /events/:slug?near=lat,lng` | 410 with `error.code` `gone` and `nearby` holding two EventSummary rows | R-6 |
| AC-4 | A member and a scheduled occurrence | `PUT /occurrences/:id/rsvp` with `status: going` twice, then `DELETE` twice | One `rsvps` row after the puts, `going_count` 1, then zero rows and 204 both times, `going_count` 0 | R-1, R-2, R-7, R-8 |
| AC-5 | A member and a cancelled occurrence | `PUT /occurrences/:id/rsvp` | 409 with code `occurrence_cancelled` | R-7 |
| AC-6 | A member with a vehicle owned by another user | `PUT /occurrences/:id/rsvp` with that `vehicle_id` | 422 | R-1 |
| AC-7 | Three going and one interested attendee, one of them blocked by the viewer | `GET /occurrences/:id/attendees` with the viewer's token | Two going then one interested, the blocked user absent, each row with `status` | R-9 |
| AC-8 | A host of a recurring event | `POST /events/:id/confirm` as the host, then as another member | 200 with `last_confirmed_at` within a second of now, then 403 | R-10 |
| AC-9 | S08 on device for a seeded, unclaimed, imported recurring meet with two sponsors | The screen is scrolled | Blocks appear in R-11 order; the host block shows "Unclaimed" and the claim line; the sponsors block lists "Coffee by Lido Coffee"; the source card names the source; photos and comments show placeholders | R-11, R-14, R-15, R-19 |
| AC-10 | S08 on device | Directions is tapped, then Add to calendar | Apple Maps opens on the venue; a calendar event with the recurrence rule is created after permission | R-12, R-13 |
| AC-11 | S08 on device, signed out | I'm going is tapped | S26 opens; after sign-in the button passes through Confirmed to Going and the count increments by one | R-16, R-17 |
| AC-12 | S08 on device, signed in, airplane mode | I'm going is tapped, then networking returns | Queued state with its caption; within 30 s the button reads Going and the RSVP exists on the server | R-17 |
| AC-13 | An event whose next occurrence is cancelled with a note | S08 renders (RNTL) | The banner shows the note and the CTA reads Cancelled and is disabled | R-19, R-17 |
| AC-14 | A host viewing their own event with `last_confirmed_at` 40 days ago | S08 renders, then "Yes, still on" is tapped | The prompt shows; after the tap the prompt disappears and "Last confirmed" reads today | R-18 |
| AC-15 | A slug that returns 410 with two nearby meets | S08 opens by deep link | The "no longer listed" page shows both nearby cards and the back button works | R-20, R-25 |
| AC-16 | S08 on device | Share is tapped | The share sheet shows the canonical URL; "Share to story" opens S34 with the rendered 9:16 card and Save image writes to Photos | R-23, R-24 |
| AC-17 | An unlisted event opened by its tokenized link | Share is tapped | The shared URL includes the same `token` | R-5, R-23 |
| AC-18 | `https://curbsocial.club/meets/:slug` tapped in Notes on a device with the app installed | The link opens | S08 opens directly with the skeleton then content, no Safari hop | R-25 |
| AC-19 | S10 with going and interested attendees | The list is scrolled | Two groups with vehicle lines where present; empty copy when none | R-22 |

| AC-20 | An occurrence starting in 30 minutes, a signed-in user 200 m away sending `location` | `POST /occurrences/:id/check_in` twice | 201 then 200, one `check_ins` row with `verified: true`, `distance_bucket: on_site`, no coordinate column populated; `check_in_count` is 1 | R-28, R-29 |
| AC-21 | An occurrence that ended three hours ago | `POST /occurrences/:id/check_in` | 409 `check_in_closed` | R-28 |
| AC-22 | A user 8 km away, and a user with no `location` | `POST /occurrences/:id/check_in` each | `distance_bucket` `remote` and `unknown`, `verified` false for both; S10 lists them under "Checked in" apart from RSVPs | R-29, R-30 |

## Verification

| Check | How |
|---|---|
| API | `pnpm --filter @curb/api test spec/requests/api/v1/events_show_spec.rb spec/requests/api/v1/rsvps_spec.rb spec/requests/api/v1/attendees_spec.rb spec/requests/api/v1/event_confirm_spec.rb spec/models/rsvp_spec.rb` |
| Components | `pnpm --filter @curb/mobile test src/features/meet-detail` covers AC-13; `pnpm --filter @curb/ui test packages/ui/button` covers the CTA state machine timings |
| Mobile | Maestro `browse_open_meet.yaml` (feed to S08 to Directions), `rsvp.yaml` (sign in, I'm going, Going, leave), `share_meet.yaml` (share sheet, story card). Manual on a physical iPhone in Marine Layer light and dark: AC-9 to AC-12, AC-14 to AC-18; Reduce Motion on for the CTA |
| Design | Figma page "iOS Screens", frame "Event detail"; CTA states per `docs/components/primary-cta.md`; story card against `brand/previews/` story frame |

## Risks and open questions

- Adopted 2026-09-06 into docs/api.md: add `token` to `GET /events/:slug` for unlisted events, define the 410 `gone` body with `nearby`, add 409 `occurrence_cancelled` to the RSVP put, add `status` and `vehicle` to attendee rows, and add `format=story` to the OG image route. Default: as written in R-5 to R-9 and R-24.
- docs/screens.md lists S34 in Phase 2 and W14 carries `?format=story`; consistent with this spec.
- Gaps item 4: RSVP is soft interest; "Last confirmed" is the trust signal. Default: counts never gate anything and never show capacity warnings at launch even when `capacity` is set.
- Gaps item 5: seeded events are unclaimed and hosted by the app account. Default: the host block shows the app account as "curb" with the unclaimed line, never a fake organizer.
- Gaps item 2: the canonical domain is a placeholder. Default: `curbsocial.club` in a single `SHARE_BASE_URL` constant in `packages/ui/share` so a domain change is one edit.
- The primary CTA open question on one-tap undo versus a confirmation sheet. Default: confirmation sheet, per the component doc.

## Session breakdown

| Slice | Deliverable | Covers | Must pass |
|---|---|---|---|
| 1 (Phase 1) | `GET /events/:slug` detail serializer with sponsorships, `viewer`, unlisted `token`, 410 with `nearby`; rswag specs | R-4 to R-6 | AC-1 to AC-3 |
| 2 (Phase 1) | S08 blocks, transparent header, when and where, Directions, Add to calendar, source card, placeholders, cancelled banner, no longer listed | R-11 to R-13, R-15, R-19, R-20 | AC-9, AC-10, AC-13, AC-15 |
| 3 (Phase 1) | Host block with the Host shape and unclaimed treatment, share sheet with canonical URL, Universal Links and `curb://` routing to S08 and S09 | R-14 (without Follow and Claim), R-23, R-25 | AC-17, AC-18 |
| 4 (Phase 2) | RSVP endpoints, counters, attendees with blocks, confirm endpoint; rswag and model specs | R-1 to R-3, R-7 to R-10 | AC-4 to AC-8 |
| 5 (Phase 2) | Primary CTA wiring with sign-in and offline queue, Interested toggle, going block, S09, S10 | R-16, R-17, R-21, R-22 | AC-11, AC-12, AC-19 |
| 6 (Phase 2) | Follow and Claim entries on the host block, "Still happening?" prompt, S34 story card (web route in web.md) | R-14 (Follow, Claim), R-18, R-24 | AC-14, AC-16 |
| 7 (Phase 4) | Photos grid and comments blocks replace placeholders (with photos-and-posts.md) | R-19 (placeholders removed) | photos-and-posts.md ACs |
| 8 (Phase 4) | `check_ins` migration, `POST /occurrences/:id/check_in` with the window and bucket rules, `check_in_count`, "I'm here" on S08 and S09, checked-in group on S10 | R-28 to R-30 | AC-20 to AC-22 |

# Spec: Notifications

Status: draft. Phase: 2 (push registration, reminders, cancellations, claim results), 3 (`import_ready`), 4 (follow-based kinds, weekly digest, inbox), 7 (`club_invite`). Last updated: 2026-09-06.
Depends on: auth-and-accounts.md (S27, device linking on sign-in), event-detail-and-rsvp.md (RSVP), create-and-host-tools.md (cancel, claims), import-from-link.md, profiles-and-follow.md (follows), photos-and-posts.md (comments), clubs.md (invites). Related decisions: gaps item 23, `docs/architecture.md` section 3.9.

## Summary

Notifications bring people back at the right moment and otherwise stay quiet. The two that matter at launch are the reminder the evening before a meet someone said they are going to, and the message from the host when a date is cancelled. Everything else is off by default or batched: new meets near you arrive as one Sunday evening digest, hosts get one announcement per date, and nothing but a cancellation pushes between 22:00 and 07:00. Every push is also a row in the inbox, so the phone and the app agree. Copy leads with the time or the distance and names the host.

## User stories

| Id | Story |
|---|---|
| US-1 | As a member who said I'm going, I want a reminder the evening before and a nudge the morning of so that I do not miss the meet. |
| US-2 | As a member who is going, I want to hear from the host when a date is cancelled so that I do not drive to an empty lot. |
| US-3 | As a member, I want to be asked about notifications only after I have done something worth reminding me about so that the first thing curb asks of me is not permission. |
| US-4 | As a member, I want one switch per kind, and a way back to iOS Settings when I said no, so that I control the noise. |
| US-5 | As a host, I want to know when my claim is decided and when my draft from a link is ready so that I can act on it. |
| US-6 | As a member who follows hosts, I want to hear when they post a meet, and a weekly note about new meets near me, so that I find things without opening the app every day. |
| US-7 | As a member, I want an inbox so that a push I swiped away is not lost. |

## Scope

In Phase 2: `POST /devices` and `PATCH /devices/:anonymous_id` with Expo push tokens; permission timing and denied handling; the `notifications` table, `profiles.notification_prefs`, the fan-out and delivery jobs, dedupe, quiet hours; kinds `reminder_24h`, `reminder_2h`, `event_cancelled` (push and email), `claim_approved`, `claim_rejected`; the Notifications section of S27; push tap routing.

In Phase 3: `import_ready`. In Phase 4: `host_published`, `event_nearby` (opt-in), `comment`, `new_follower`, `weekly_digest` (push and email), the inbox (S30), the bell and badge on S02, `GET /notifications`, `PATCH /notifications/:id`, `POST /notifications/read_all`, 90-day purge. In Phase 7: `club_invite`.

Not in this spec: the sign-in sheet and initial device registration at first launch (auth-and-accounts.md); a schedule-change kind (none exists; see Risks); host-composed free-text announcements (Later); direct APNs (`apnotic` stays the documented fallback, not built); Android channels (Phase 7); marketing email of any kind (never at launch).

## Requirements

**Data**

- R-1 A `devices` row MUST be upserted on `anonymous_id` with `platform`, `push_token`, `push_enabled`, `app_version`, coarse `home_location`, `timezone`, and `last_seen_at`, and MUST be linked to `user_id` on sign-in. (US-3)
- R-2 Every delivered notification MUST exist first as a `notifications` row with `user_id`, `kind`, `payload` (ids, display strings, and `deep_link`, enough to render without joins), and MUST record `pushed_at` and `emailed_at` when those projections happen. (US-7)
- R-3 A row MUST carry a `dedupe_key` unique per `(user_id, dedupe_key)`; fan-out MUST use `insert_all` with `unique_by` so a repeated trigger never creates a second row. (US-2)
- R-4 `profiles.notification_prefs` MUST be a map of kind to `{ push, email }`, MUST be merged over the defaults in the kinds table on read, and MUST reject unknown kinds on write. (US-4)
- R-5 `notifications` older than 90 days MUST be deleted nightly by `PurgeNotificationsJob`. (US-7)

**Kinds**

- R-6 Every kind in `notifications.kind` MUST implement the trigger, audience, default, copy template, deep link, and phase in the kinds table below, and MUST NOT push to a user whose pref for that kind is off. (US-1, US-2, US-5, US-6)
- R-7 `reminder_24h` MUST be sent at 18:00 in the occurrence's timezone on the calendar day before `starts_at`, and `reminder_2h` two hours before `starts_at`, to RSVPs with `status: going` whose `rsvps.created_at` precedes the send time. (US-1)
- R-8 `event_cancelled` MUST fan out once per occurrence (dedupe `event_cancelled:<occurrence_id>`) to going and interested RSVPs plus followers of the event, minus the acting host; cancelling the whole event (`DELETE /events/:id`) MUST send one row per user (dedupe `event_cancelled:event:<event_id>`), not one per date. (US-2)
- R-9 A host MUST NOT be able to trigger more than one push per event per occurrence per kind: the dedupe keys in R-8 and `host_published:<event_id>` are the enforcement, so a cancel, restore, and cancel again sends once. (US-2)
- R-10 `event_nearby` MUST be off by default because `weekly_digest` is the default for new meets near you (gaps item 23); when on, it MUST batch hourly and send at most one per user per day. (US-6)
- R-11 `weekly_digest` MUST run for each user at 18:00 local on Sunday (device timezone, fallback `America/Los_Angeles`) only when at least one public event with `published_at` in the last 7 days lies within 32 km of `profiles.home_location`, with dedupe `weekly_digest:<iso_week>`. (US-6)

**Jobs and delivery**

- R-12 `NotificationFanoutJob(kind, subject_type, subject_id)` MUST resolve the audience, insert rows in batches of 1000, then enqueue `NotificationDeliveryJob` per 100 rows for push and `NotificationEmailJob` for email-eligible kinds where `users.email` is present and the email pref is on. (US-2)
- R-13 `NotificationDeliveryJob` MUST send through `exponent-server-sdk` with `badge` set to the user's unread count and `data: { notification_id, kind, deep_link }`, MUST set `pushed_at`, and a `PushReceiptJob` 15 minutes later MUST null `devices.push_token` and set `push_enabled: false` on `DeviceNotRegistered`. (US-3)
- R-14 Quiet hours: a push whose send time falls between 22:00 and 07:00 in the device timezone MUST be enqueued with `wait_until` the next 07:00, except `event_cancelled`, which sends immediately; a deferred `reminder_2h` MUST be dropped (row kept, `pushed_at` null) when 07:00 is at or after `starts_at`. (US-1, US-2)
- R-15 `ReminderSchedulerJob` MUST run every 15 minutes, select `scheduled` occurrences starting within 30 hours, compute both send times per R-7, fan out those whose send time is at or before now and within the last 6 hours, and rely on R-3 to be idempotent across runs. (US-1)
- R-16 `WeeklyDigestJob` MUST run hourly, select users whose local time is in the 18:00 hour on Sunday, and apply R-11; the email MUST go through Resend with a plain-text part and an unsubscribe link that flips the email pref. (US-6)
- R-17 Email MUST be limited to `event_cancelled` and `weekly_digest`, MUST use flat templates (serif title, thin rule, no images from Meta sources), and MUST set `emailed_at`. (US-2, US-6)

**API**

- R-18 `POST /devices` MUST work without a token, MUST upsert on `anonymous_id`, and MUST return 200 with the device; `PATCH /devices/:anonymous_id` MUST accept `push_token`, `push_enabled`, `home_location`, `app_version`, and `timezone`, and MUST return 404 when the device belongs to another user. (US-3)
- R-19 `GET /notifications` MUST return the caller's rows newest first, cursor paginated, with `meta.unread_count`; `PATCH /notifications/:id { read: true }` MUST set `read_at` once; `POST /notifications/read_all` MUST set `read_at` on every unread row and return `{ unread_count: 0 }`. (US-7)
- R-20 `GET /me` MUST include `unread_notifications_count` and the merged `notification_prefs`; `PATCH /me { profile: { notification_prefs } }` MUST accept a partial map. (US-4, US-7)

**Mobile**

- R-21 The app MUST call `POST /devices` on first launch and on every cold start when `app_version`, the Expo token, or the timezone changed, and MUST send `X-Device-Id` on every request. (US-3)
- R-22 The permission sheet MUST appear only after the first successful RSVP or follow, once, with the explanation copy before `requestPermissionsAsync`; Not now MUST not re-prompt except from S27. (US-3)
- R-23 On grant the app MUST fetch the Expo token with the EAS `projectId` and `PATCH /devices/:anonymous_id { push_token, push_enabled: true, timezone }`; on denial S27 MUST show the denied banner with an Open Settings action calling `Linking.openSettings()`. (US-3, US-4)
- R-24 Tapping a push MUST navigate to `data.deep_link` through Expo Router (cold start included) and MUST call `PATCH /notifications/:id { read: true }`. (US-1, US-2)
- R-25 S27's Notifications section MUST list one switch per kind grouped as Your meets (`reminder_24h`, `reminder_2h`, `event_cancelled`), Hosting (`claim_approved`, `claim_rejected`, `import_ready`, `comment` in Phase 4), Following (`host_published`, `new_follower`, Phase 4), and Nearby (`weekly_digest`, `event_nearby`, Phase 4), plus email switches for `event_cancelled` and `weekly_digest` shown only when `users.email` is present, saving through `PATCH /me` optimistically. (US-4)
- R-26 S30 MUST list `GET /notifications` grouped Today, This week, Earlier, with an unread dot, tap to mark read and open the deep link, a Mark all read action, pull to refresh, and the denied banner from R-23 when permission is denied. (US-7)
- R-27 The bell on S02 MUST show a badge with `unread_notifications_count` refreshed on foreground and after read actions, MUST open S30, and MUST be hidden until Phase 4; the app icon badge MUST mirror the same count through `setBadgeCountAsync`. (US-7)

**Web**

- R-28 None: web has no push or inbox at launch; the digest email links to `/meets` (W02) and the unsubscribe page is W16 (`/unsubscribe/:token`). (US-6)

**Admin and jobs**

- R-29 A02 (admin.md) SHOULD show fan-out and delivery job health and the last digest run; failures MUST report to Sentry with the kind and batch size. (US-2)

## Data

`devices` (all columns including `timezone`), `notifications` (all columns including `dedupe_key`), `profiles.notification_prefs`, `profiles.home_location`, `users.email`; reads `rsvps`, `follows`, `event_occurrences`, `events`, `claim_requests`, `imports`, `club_memberships`. Migration: slice 1 creates `notifications` with every column in the data model including `dedupe_key` and its partial unique index; `devices.timezone` already exists from the Phase 0 auth migration.

## API

Uses `POST /devices`, `PATCH /devices/:anonymous_id`, `GET /notifications`, `PATCH /notifications/:id`, `POST /notifications/read_all`, `GET /me`, `PATCH /me`. Deltas adopted into docs/api.md on 2026-09-06 (Risks): `timezone` on devices; `meta.unread_count` on `GET /notifications`; `unread_notifications_count` on `GET /me`.

Kinds (copy is at most 90 chars; `{n}` is a numeral; day and time are in the occurrence's timezone):

| Kind | Trigger | Audience | Default push, email | Copy template | Deep link | Phase |
|---|---|---|---|---|---|---|
| `reminder_24h` | 18:00 local the day before | Going RSVPs | on, none | Tomorrow {time}: {title}. {n} going. Directions? | `curb://occurrences/{id}` | 2 |
| `reminder_2h` | 2 h before start | Going RSVPs | on, none | {time} today: {title} at {venue}. {n} going. | `curb://occurrences/{id}` | 2 |
| `event_cancelled` | Occurrence or event cancelled | Going, interested, event followers | on, on | Cancelled {day}: {title}. Host note: {note}. (without a note: Cancelled {day}: {title}.) (event: {title} is no longer running. The host cancelled it.) | `curb://occurrences/{id}` or `curb://meets/{slug}` | 2 |
| `claim_approved` | A09 approves | Claimant | on, none | You're the host of {title} now. Edit it any time. | `curb://meets/{slug}` | 2 |
| `claim_rejected` | A09 rejects | Claimant | on, none | We couldn't approve your claim on {title}. Open it to see why. | `curb://meets/{slug}/claim` | 2 |
| `import_ready` | Import ready, client not polling for 5 s | Import owner | on, none | Your draft from {platform} is ready to check. | `curb://imports/{id}` | 3 |
| `host_published` | Followed host publishes a public event | Host's followers | on, none | {host} posted a meet for {day}, {Mon D}. | `curb://meets/{slug}` | 4 |
| `event_nearby` | Public event published within 32 km | Users with a home location | off, none | {distance} mi away: {title}, {day} {time}. Hosted by {host}. | `curb://meets/{slug}` | 4 |
| `comment` | Comment on your event or post, or a reply to yours | Host, author, parent author | on, none | {name} on {title}: "{body, 60 chars}" | `curb://meets/{slug}/comments` or `curb://posts/{id}` | 4 |
| `new_follower` | A user follows you | Followed user | on, none | {name} (@{handle}) followed you. | `curb://u/{handle}` | 4 |
| `weekly_digest` | Sunday 18:00 local, at least one new meet in radius | Users with a home location | on, off | {n} new meets within 20 miles. {title}, {day} {time}, and {n-1} more. | `curb://` | 4 |
| `club_invite` | `POST /clubs/:id/invites` | Invited user | on, none | {club} invited you to join. | `curb://clubs/{slug}` | 7 |

## Screens and states

| Screen id | Screen | Route (mobile / web) | Primary actions | States |
|---|---|---|---|---|
| S27 | Settings, Notifications section | `settings` / none | Toggle a kind, Open Settings | loading, permission not asked, granted, denied, offline (toggles disabled), error |
| S30 | Notifications inbox | `notifications` / none | Open a row, Mark all read | loading, empty, error, offline (cached rows), permission denied banner |
| S02 | Home, bell | `(tabs)/index` / `/` | Open inbox | badge count, hidden (before Phase 4) |
| Permission sheet | Sheet after first RSVP or follow | none / none | Turn on, Not now | none |

## Copy

| Where | String |
|---|---|
| Permission sheet title | Hear about the meets you're going to |
| Permission sheet body | A reminder the evening before, and a message from the host if a date is cancelled. Nothing else unless you turn it on. |
| Permission sheet actions | Turn on notifications / Not now |
| S27 section title | Notifications |
| S27 denied banner | Notifications are off for curb in iOS Settings. (Open Settings) |
| S27 not asked | We'll ask after you mark yourself going to something. (Turn on now) |
| S27 group titles | Your meets, Hosting, Following, Nearby |
| S27 row labels | Reminder the evening before, Reminder 2 hours before, Cancellations, Claim decisions, Draft ready, Comments, Host you follow posted, New follower, Weekly digest of new meets, Every new meet near you |
| S27 email labels | Also email me cancellations, Email me the weekly digest |
| S27 nearby helper | The digest goes out Sunday evening, only when there's something new within 20 miles. |
| S27 offline | You're offline. Changes will save when you're back. |
| S30 title | Notifications |
| S30 groups | Today, This week, Earlier |
| S30 empty | Nothing yet. Reminders and host messages land here. |
| S30 mark all | Mark all read |
| S30 error | Couldn't load notifications. (Retry) |
| S02 bell accessibility label | Notifications, {n} unread |
| Email subject, cancelled | Cancelled {day}: {title} |
| Email subject, digest | {n} new meets within 20 miles this week |
| Email footer | You're getting this because you turned it on in curb. Unsubscribe. |

## Acceptance criteria

| Id | Given | When | Then | Proves |
|---|---|---|---|---|
| AC-1 | No device row | `POST /devices` twice with the same `anonymous_id` and different `app_version` | 200 both times, one row with the newer version; `PATCH /devices/:anonymous_id { push_token, timezone }` stores both; a PATCH from a different user's token gets 404 | R-1, R-18 |
| AC-2 | A user with `notification_prefs: { reminder_2h: { push: false } }` | `GET /me` | `notification_prefs` has every kind with defaults merged and `reminder_2h.push` false; `PATCH /me` with `{ bogus_kind: {} }` returns 422 | R-4, R-20 |
| AC-3 (job spec) | An occurrence Saturday 07:30 PT with going RSVPs A (created Thursday), B (`reminder_24h` off), C (created Friday 18:30 PT), and one interested RSVP | `ReminderSchedulerJob` runs at Friday 19:00 PT (the 18:00 run was missed), then again at 19:15 | After the first run exactly one `reminder_24h` row exists, for A, with `dedupe_key` `reminder_24h:<occurrence_id>`, copy "Tomorrow 7:30 am: ..." and one delivery job; the second run adds nothing | R-3, R-7, R-15 |
| AC-4 (quiet hours) | The same occurrence, A's device timezone `America/Los_Angeles`; a second occurrence Sunday 06:30 PT that A is going to | The scheduler runs at Saturday 05:30 PT and Sunday 04:30 PT | Saturday: a `reminder_2h` row with a delivery job scheduled for 07:00 PT; Sunday: a row with no delivery job and `pushed_at` null | R-14, R-15 |
| AC-5 | An occurrence with 2 going, 1 interested, 1 event follower, and the host | `PATCH /occurrences/:id { status: "cancelled", override_note: "Rain" }` at 23:10 PT, then restore, then cancel again | Four `event_cancelled` rows with the note in the copy, none for the host, delivery enqueued immediately (no `wait_until`); the second cancel creates no rows | R-8, R-9, R-12, R-14 |
| AC-6 | A weekly event with 6 future occurrences and one user going to 3 of them | `DELETE /events/:id` | That user has exactly one `event_cancelled` row with dedupe `event_cancelled:event:<event_id>` and the event copy | R-8 |
| AC-7 | A user with an email and `event_cancelled.email` on, another without an email | `NotificationFanoutJob` for a cancellation | `NotificationEmailJob` runs for the first only; `emailed_at` set; the Resend payload has a plain-text part | R-12, R-17 |
| AC-8 | A pending claim | A09 approves it; another is rejected | One `claim_approved` row with the approved copy and deep link; one `claim_rejected` row linking to the claim sheet | R-6 |
| AC-9 | A delivery batch where Expo returns `DeviceNotRegistered` for one token | `PushReceiptJob` runs | That device has `push_token` null and `push_enabled` false; other rows keep `pushed_at` | R-13 |
| AC-10 | A user in `America/Los_Angeles` with a home location, two public events published 3 days ago within 20 km and one 60 km away; a second user with no new events nearby | `WeeklyDigestJob` runs at Sunday 18:20 PT, then 19:20 | One `weekly_digest` row for the first user reading "2 new meets within 20 miles. ..." with dedupe `weekly_digest:<iso_week>`; none for the second; the 19:20 run adds nothing | R-11, R-16 |
| AC-11 | A user with 3 unread and 2 read rows | `GET /notifications`, `PATCH /notifications/:id { read: true }` on one, `POST /notifications/read_all` | `meta.unread_count` 3, then 2, then `{ unread_count: 0 }`; another user's row returns 404 on PATCH | R-19 |
| AC-12 | Rows aged 91 and 89 days | `PurgeNotificationsJob` runs | The 91-day row is gone, the 89-day row remains | R-5 |
| AC-13 | A user who follows host H, `event_nearby` at default | H publishes a public event 5 km from the user | One `host_published` row; no `event_nearby` row; a second publish of the same event (draft to published again) adds nothing | R-6, R-9, R-10 |
| AC-14 | Device, fresh install, signed in | The first I'm going is tapped | The permission sheet appears before the system prompt; Not now dismisses; no sheet on the next RSVP; S27 shows the not-asked row | R-22 |
| AC-15 | Device, permission denied in iOS Settings | S27 is opened | The denied banner shows; Open Settings lands on curb's iOS Settings page | R-23 |
| AC-16 | Device, permission granted, app killed | A `reminder_24h` push is sent from staging and tapped | The app cold starts on S09 for that occurrence; the row is read on the next `GET /notifications` | R-24 |
| AC-17 | Device, Phase 4, 2 unread | Home is opened, then S30, then Mark all read | The bell badge reads 2, the app icon badge reads 2, both clear after Mark all read | R-26, R-27 |

## Verification

| Check | How |
|---|---|
| API | `pnpm --filter @curb/api test spec/requests/api/v1/devices_spec.rb spec/requests/api/v1/notifications_spec.rb spec/requests/api/v1/me_spec.rb spec/models/notification_spec.rb` |
| Jobs | `pnpm --filter @curb/api test spec/jobs/reminder_scheduler_job_spec.rb spec/jobs/notification_fanout_job_spec.rb spec/jobs/notification_delivery_job_spec.rb spec/jobs/push_receipt_job_spec.rb spec/jobs/weekly_digest_job_spec.rb spec/jobs/purge_notifications_job_spec.rb spec/services/quiet_hours_spec.rb` with `travel_to` and `ActiveJob::TestHelper` |
| Email | `spec/mailers/notification_mailer_spec.rb` with Resend stubbed; preview at `/rails/mailers` |
| Mobile | Manual on a physical iPhone in Marine Layer light: AC-14 to AC-17 against staging with a `bin/rails notifications:send_test[user_id,kind]` task |
| Design | Figma page "iOS Screens", frames "Permission sheet", "Settings, notifications", "Inbox"; flat rendering check per design-system-and-theming.md |

## Risks and open questions

- Adopted 2026-09-06 into docs/data-model.md: add `notifications.dedupe_key` (text) with `UNIQUE (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL`, and `devices.timezone` (text, IANA). Without the first, R-9's one-announcement rule and idempotent scheduling need a query per row; without the second, quiet hours and the digest hour have no local time.
- Adopted 2026-09-06 into docs/api.md: `timezone` on `POST` and `PATCH /devices`; `meta.unread_count` on `GET /notifications`; `unread_notifications_count` on `GET /me`; `POST /notifications/unsubscribe { token }` (anon, signed token) plus a web page `/unsubscribe/:token` (W16 group) that calls it.
- Gaps item 23: the beachhead persona is notification-averse. Default: only reminders, cancellations, and claim results push in Phase 2; the digest is the default for nearby; `event_nearby` is opt-in and capped daily.
- `event_updated` was added to `notifications.kind` on 2026-09-06 and ships in Phase 4; a moved date sends nothing in Phase 2 (create-and-host-tools.md notes the same). The brand guide's "Series moved" copy is ready for it.
- The `reminder_24h` name is kept from the data model although it fires at 18:00 the evening before (app overview: "reminder the evening before"), which for a 7:30 am meet is 13.5 hours out. Renaming the kind is not worth the churn.
- Anonymous devices can hold a push token but `notifications.user_id` is required, so nothing pushes before sign-in; `event_nearby` for anonymous devices is Later.
- Architecture 3.9 says "new event within radius, batched hourly, at most one per day" for `event_nearby`; R-10 keeps that behavior but off by default, which is the decision in gaps item 23.
- Expo push receipts are best effort; if `DeviceNotRegistered` handling proves unreliable, the fallback is to drop tokens after three consecutive delivery errors.

## Session breakdown

| Slice | Deliverable | Covers | Must pass |
|---|---|---|---|
| 1 (Phase 2) | `notifications` migration, `Notification` model, prefs merge and validation, `POST` and `PATCH /devices`, `NotificationFanoutJob`, `NotificationDeliveryJob`, `PushReceiptJob`, `QuietHours` service, rswag specs | R-1 to R-4, R-12 to R-14, R-18, R-20 | AC-1, AC-2, AC-9 |
| 2 (Phase 2) | `ReminderSchedulerJob` with both kinds, Solid Queue recurring entry, copy templates, quiet-hours deferral and drop | R-7, R-15 | AC-3, AC-4 |
| 3 (Phase 2) | `event_cancelled` hooks on `PATCH /occurrences/:id` and `DELETE /events/:id`, `claim_approved` and `claim_rejected` hooks, `NotificationEmailJob` and `NotificationMailer#event_cancelled` through Resend | R-6, R-8, R-9, R-17 | AC-5 to AC-8 |
| 4 (Phase 2) | Mobile: device registration on launch, permission sheet after first RSVP or follow, token PATCH, denied banner in S27, S27 Notifications section, push tap routing | R-21 to R-25 | AC-14 to AC-16 |
| 5 (Phase 3) | `import_ready` hook in `ImportJob` with the 5 s polling check (with import-from-link.md slice 4) | R-6 | Request spec in `spec/jobs/import_job_spec.rb` |
| 6 (Phase 4) | `host_published`, `event_nearby` (hourly batch, daily cap), `comment`, `new_follower` fan-outs and hooks | R-6, R-9, R-10 | AC-13 |
| 7 (Phase 4) | `WeeklyDigestJob`, `NotificationMailer#weekly_digest`, unsubscribe token endpoint and web page | R-11, R-16, R-17 | AC-10 |
| 8 (Phase 4) | `GET /notifications`, `PATCH`, `read_all`, `unread_notifications_count`, `PurgeNotificationsJob`, S30 inbox, bell and badges on S02 | R-5, R-19, R-26, R-27 | AC-11, AC-12, AC-17 |
| 9 (Phase 7) | `club_invite` hook on `POST /clubs/:id/invites` (with clubs.md slice 7) | R-6 | Request spec in `spec/requests/api/v1/clubs_spec.rb` |

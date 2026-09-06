# Spec: Moderation and safety

Status: draft. Phase: 2 (report, block, admin queue, legal pages), 4 (image safety filter, photo, comment, and spot moderation, venue permission flag). Last updated: 2026-09-06.
Depends on: auth-and-accounts.md (S26, S27, roles), profiles-and-follow.md (block mechanics), admin.md (A01, A02, A08, A10), photos-and-posts.md (`safety_status`), spots.md, create-and-host-tools.md (S20, S23), web.md (W16), notifications.md. Related decisions: gaps items 3, 11, 12; App Store Review Guideline 1.2.

## Summary

Every piece of user content on curb can be reported and every person can be blocked, from the first beta build, because App Review requires it and because a solo moderator needs the community to do the first pass. Reports land in a queue with a 24 hour target; three independent reports hide content on their own; photos are checked by a classifier before anyone sees them, with neutral copy and an email appeal. The rules people agree to (terms, privacy, community guidelines) are web pages linked from the app. The voice stays calm even here: say what happened and what to do next.

## User stories

| Id | Story |
|---|---|
| US-1 | As a member, I want to report a meet, post, comment, person, club, sponsor, or spot with a clear reason so that it gets looked at. |
| US-2 | As a member, I want to block someone so that we stop seeing each other on curb. |
| US-3 | As an admin, I want a queue that groups reports by object and records every action so that I can act quickly and defend the decision later. |
| US-4 | As a browser, I want to read the guidelines, terms, and privacy policy before I sign up. |
| US-5 | As a member, I want photos checked before they are shown, with a plain message and a way to appeal if mine is held. |
| US-6 | As a host or property owner, I want to flag a meet or spot listed on property without permission so that it comes down. |
| US-7 | As the builder, I want a trusted host to cover the queue when I cannot, without giving them the whole admin. |
| US-8 | As a rights holder, I want a published way to send a takedown notice and see it handled. |

## Scope

In Phase 2: `reports`, `blocks`, `moderation_actions`; `POST /reports` on all seven types (Post, Comment, and Spot content arrives in Phase 4, the endpoint accepts them from the start); the report sheet (S33); reporter-side hide; auto-hide at three; block summary and the blocked users list; the admin queue (A10) with hide, remove, restore, warn, suspend, dismiss, and the audit trail; moderator role as backup; the SLA nudge; terms acceptance at signup; legal pages (W16); published contact; DMCA agent and act-by-URL; App Review reviewer notes.

In Phase 4: `ImageSafetyCheckJob` with a vendor adapter and thresholds; posts, comments, and spots in the queue with previews; `unauthorized_location` handling for spots. (`venue_permission_confirmed` on claims ships in Phase 2 with create-and-host-tools.md slice 3; R-11 and AC-17 here restate it.)

Not in this spec: block query mechanics and the blocked profile state (profiles-and-follow.md); account deletion (auth-and-accounts.md); admin sign-in and user CRUD (admin.md); the legal text itself (the builder with counsel, gaps item 3); reporting on web (Phase 7); trust scores or automatic suspension (never before launch).

## Requirements

**Data**

- R-1 A report MUST have `reportable_type` in `Event`, `Post`, `Comment`, `User`, `Club`, `Sponsor`, `Spot`, a `reason` from `docs/data-model.md` that is allowed for that type per the table in Data, `details` of at most 500 characters, and `status` in `open`, `reviewed`, `dismissed`, `actioned`. (US-1)
- R-2 A reporter MUST have at most one `open` report per object (partial unique index); a second submission MUST return the existing report. (US-1)
- R-3 When `open` reports from three distinct reporters exist on an Event, Post, Comment, or Spot, the object MUST be hidden in the same transaction and a `moderation_actions` row MUST be written with `action: hide`, `moderator_id` null (automated action), `report_id` set to the third report, and `note: auto_hide`; User, Club, and Sponsor MUST never be auto-hidden and instead sort to the top of A10. (US-1, US-3)
- R-4 "Hidden" MUST mean: for an Event, `hidden_at` set, 410 `gone` with `nearby` to the public, absent from lists, map, feed, and search, reminders paused, RSVPs kept; for a Post, Comment, or Spot, `status: hidden` with the visibility rules in their specs. (US-1)
- R-5 A block MUST hide both users' posts, comments, going-list and member entries from each other, MUST remove follows in both directions, and MUST make commenting on each other's content return 403; events stay listed because they are public listings; the query mechanics live in profiles-and-follow.md. (US-2)
- R-6 Every admin, moderator, or system action MUST write a `moderation_actions` row with `target_type`, `target_id`, `action`, `note`, and `report_id` when taken from a report; an action from a report MUST set that report and every other `open` report on the same object to `actioned`, or `dismissed` for a dismiss. (US-3)
- R-7 Suspending a user MUST set `users.status: suspended`, delete their sessions, hide their posts, comments, and spots, set `hidden_at` on events they host as a user, and MUST NOT restore any of it automatically when the suspension is lifted. (US-3)
- R-8 Warning a user MUST send an email through Resend containing the note and a link to `/guidelines` and MUST write the action; no push is sent. (US-3)
- R-9 `reports` and `moderation_actions` MUST be kept indefinitely; when a reporter is purged, `reporter_id` MUST become null and `details` kept; blobs of removed photos are purged after 30 days (photos-and-posts.md R-45); vendor responses from the safety check MUST NOT be stored beyond the label and score in the action note. (US-3)
- R-10 The first successful sign-in through S26 MUST set `users.terms_accepted_at`. (US-4)
- R-11 A claim MUST carry `venue_permission_confirmed: true` (on `claim_requests`) or be rejected with 422, and A09 MUST display the flag. (US-6)

**API**

- R-12 `POST /reports` MUST accept anonymous requests (the browse-without-an-account principle covers reporting a fake listing) recording `device_id` from `X-Device-Id` when there is no user, MUST return 404 for an unknown object, 422 for a reason not allowed for the type or for reporting yourself or your own content, 201 `{ id, status }` on create, 200 with the existing id on a duplicate, and 429 `rate_limited` with `Retry-After` after 20 reports per user per day, or 5 per device and 20 per IP per day when anonymous. (US-1)
- R-13 List endpoints (`GET /events`, `GET /events/map`, `GET /feed`, `GET /occurrences/:id/posts`, `GET /events/:slug/comments`, `GET /posts/:id/comments`, `GET /spots`, `GET /spots/map`) MUST exclude objects on which the viewer has an `open` report, and detail shapes for Event, Post, Comment, Spot, and Profile MUST include `viewer.reported`. (US-1)
- R-14 A hidden object MUST return 410 `gone` (Event) or 404 (Post, Comment, Spot) on public reads and MUST be returned to its owner (event host, post author, comment author) with `hidden: true` so the client can show the under-review copy; admins MAY read it through the admin UI only. (US-1, US-3)
- R-15 `PUT /blocks/:user_id` and `DELETE /blocks/:user_id` MUST be idempotent, MUST return 422 for self and 404 for an unknown user, and `GET /me/blocks` MUST return MiniProfile[] of blocked users. (US-2)
- R-16 A suspended user MUST receive 403 `forbidden` with `details.reason: suspended` on every authenticated request and on `POST /auth/*`. (US-3)
- R-17 `ImageSafetyCheckJob` MUST run after `ProcessPhotoJob`, MUST call `Safety::Classifier.classify(blob)` (an adapter returning `{ labels: [{ name, score }] }`) for each photo, MUST take the maximum score across photos per category in `nudity`, `sexual`, `violence_graphic`, `hate_symbols`, and MUST apply `config/safety.yml` thresholds: at or above `reject_at` (default 0.85) the post stays `hidden` with `safety_status: rejected` and a system `hide` action noting the label and score; at or above `review_at` (default 0.6) the post becomes `visible` with `safety_status: passed` and a system report (`reporter_id` app account, reason `inappropriate`, details naming the label and score) so it appears in A10; below, `passed` and `visible`. (US-5)
- R-18 A classifier error MUST retry at 30 s, 5 min, and 30 min; on final failure the post MUST stay `hidden` with `safety_status: pending`, a system report with details `safety check failed` MUST be filed, and Sentry MUST be notified; the check never fails open. (US-5)
- R-19 Restoring a rejected or pending post from A10 MUST set `safety_status: passed` and `status: visible` and write a `restore` action; this is the appeal path after the email. (US-5)
- R-20 `Safety::FakeClassifier` MUST be the adapter in test and development, reading labels from the blob's `metadata.safety_labels`, so specs and device builds run without the vendor. (US-5)

**Mobile**

- R-21 S33 MUST open from long press on event cards, posts, photos, and comments and from the overflow menus of S08, S11, S12, S14, S15, and S16, MUST list the reasons allowed for the type in the order of the Copy table with an optional details field, MUST open S26 first for a signed-out user and continue afterward, and MUST render submitted, rate limited, and self-report states. (US-1)
- R-22 After a successful report the client MUST remove the object from the current list, replace it in place with the "You reported this." row where the layout needs a placeholder (S32, S16), and invalidate the affected queries. (US-1)
- R-23 Block MUST be offered on S11 (overflow) and S32 (long press) with a confirmation sheet, and S27 MUST have a Blocked users screen from `GET /me/blocks` with Unblock. (US-2)
- R-24 S26 MUST show the terms line with links to `/terms` and `/privacy` beneath the sign-in buttons. (US-4)
- R-25 S27 MUST link Terms, Privacy policy, and Community guidelines to W16 in an in-app browser and MUST show hello@curbsocial.club under About. (US-4)
- R-26 A hidden event MUST show its host the under-review banner on S08 with edit still allowed; a hidden comment MUST show its author the hidden label in S32; a rejected photo post MUST show the neutral copy from photos-and-posts.md with a link to `/guidelines`. (US-1, US-5)
- R-27 S23 MUST include the venue permission checkbox and MUST keep the claim CTA disabled until it is checked; S20 SHOULD show the one-line permission notice above Publish without blocking. (US-6)
- R-28 The App Store reviewer notes MUST describe report on every type, block, the pre-publication image check, the queue, the 24 hour target, and the contact email, using the text in Copy. (US-7)

**Web**

- R-29 W16 MUST serve `/terms`, `/privacy`, `/guidelines`, and `/bot` from Markdown under `apps/web/content/legal/`, indexable, each with a last updated date; `/terms` MUST include the venue permission and spot clauses and a DMCA section naming the registered agent, a postal address, and hello@curbsocial.club; `/guidelines` MUST have the sections listed in Copy. (US-4, US-6, US-8)
- R-30 Hidden or removed objects on web MUST render the "no longer listed" page with a 410, with nearby meets on W03 and plain on W11 and W13. (US-1)
- R-31 The web footer MUST link `/guidelines`, which names the contact email for reports from people without the app. (US-1)

**Admin and jobs**

- R-32 `GET /admin/reports` MUST require an admin session with role `admin` or `moderator` and MUST redirect any other request to `/admin/sign_in` with 302; the queue MUST group open reports by object with type, preview, distinct reporter count, reasons, and oldest age, default to `open`, filter by type, status, and a Safety chip, sort by reporter count then oldest, and highlight rows older than 24 h. (US-3, US-7)
- R-33 Each group MUST open a detail with every report, prior actions on the object and its author, and the actions hide, remove, restore, warn user, suspend user, dismiss; every action except dismiss MUST require a note; moderators MAY hide, restore, warn, and dismiss, and only admins MAY remove or suspend (the buttons are hidden and the POST returns 403). (US-3, US-7)
- R-34 "Remove" MUST mean `status: removed` for a Post, Comment, or Spot and `status: cancelled` plus `hidden_at` for an Event; users are removed through A08, not the queue. (US-3)
- R-35 A10 MUST have an act-by-URL form that accepts a curb URL or id and takes any action with `report_id: null`, for DMCA notices and reports that arrive by email. (US-8)
- R-36 `ModerationSlaJob` MUST run daily at 8 am Pacific and email every admin and moderator when any `open` report is older than 12 h, naming the count and the oldest age; A02 MUST show the open count and oldest age. (US-3, US-7)
- R-37 An admin MUST be able to set `role: moderator` on a user in A08 so a trusted host can sign in at A01 and work the queue (gaps item 12). (US-7)

## Data

`reports`, `moderation_actions`, `blocks`, `users.role`, `users.status`, plus `events.hidden_at`, `users.terms_accepted_at`, `claim_requests.venue_permission_confirmed`, the partial unique index `reports (reporter_id, reportable_type, reportable_id) WHERE status = 'open'`, and `config/safety.yml` (`reject_at`, `review_at`, categories). The app account is the `moderator_id` for system actions and the `reporter_id` for system reports.

Reasons allowed per type:

| Type | Reasons |
|---|---|
| Event | spam, not_a_car_meet, wrong_info, unauthorized_location, harassment, inappropriate, copyright, other |
| Post | spam, inappropriate, harassment, copyright, other |
| Comment | spam, harassment, inappropriate, other |
| User | spam, harassment, inappropriate, other |
| Club, Sponsor | spam, wrong_info, inappropriate, other |
| Spot | unauthorized_location, wrong_info, inappropriate, spam, other |

## API

`POST /reports`, `PUT /blocks/:user_id`, `DELETE /blocks/:user_id`, `GET /me/blocks`, `POST /events/:id/claims` (gains `venue_permission_confirmed`), plus `viewer.reported` on detail shapes and `hidden: true` on owner reads. Admin routes under `/admin/reports` are server-rendered and outside v1.

## Screens and states

| Screen id | Screen | Route (mobile / web) | Primary actions | States |
|---|---|---|---|---|
| S33 | Report sheet | sheet / none | Pick a reason, add details, Submit | reasons for type, submitting, submitted, rate limited, self-report, signed-out, offline |
| S11 | Profile, block | `u/[handle]` / `/u/:handle` | Block, Unblock | blocked (profiles-and-follow.md) |
| S27 | Settings, Blocked users and legal links | `settings` / none | Unblock, open Terms, Privacy, Guidelines | empty |
| S26 | Sign-in sheet, terms line | `sign-in` (modal) / none | Open terms, privacy | none |
| S23 | Claim sheet, permission checkbox | `meets/[slug]/claim` / none | Confirm permission, Claim | unchecked (CTA disabled) |
| S08 | Event detail, hidden (host) | `meets/[slug]` / `/meets/:slug` | Edit | under review banner |
| W16 | Legal | none / `/terms`, `/privacy`, `/guidelines`, `/bot` | Read | none |
| A10 | Moderation queue | `/admin/reports` | Hide, remove, restore, warn, suspend, dismiss, act by URL | empty, filtered, over SLA, 403 on admin-only actions |

## Copy

| Where | String |
|---|---|
| S33 title | Report |
| S33 reason, spam | Spam or misleading |
| S33 reason, harassment | Harassment or hate |
| S33 reason, inappropriate | Nudity, violence, or other content that doesn't belong here |
| S33 reason, not_a_car_meet | Not a real car meet |
| S33 reason, wrong_info | Wrong time, place, or details |
| S33 reason, unauthorized_location | On property without permission |
| S33 reason, copyright | Uses my photo or content without permission |
| S33 reason, other | Something else |
| S33 details placeholder | Anything that helps us check (optional) |
| S33 submit CTA | Submit report |
| S33 submitted | Thanks. We look at reports within a day. You won't see this again. |
| S33 done CTA | Done |
| S33 rate limited | That's a lot of reports for one day. Try again tomorrow, or email hello@curbsocial.club. |
| S33 self-report | You can't report your own listing. Edit or delete it instead. |
| S33 offline | You're offline. Reports need a connection. |
| Reported placeholder | You reported this. |
| S11 block CTA | Block @handle |
| S11 block confirm (owned by profiles-and-follow.md) | Block @{handle}? You won't see each other in going lists, comments, or the feed, and you'll stop following each other. (Block / Cancel) |
| S11 unblock CTA | Unblock |
| S27 blocked users title | Blocked users |
| S27 blocked users empty | No one blocked. |
| S27 legal links | Terms, Privacy policy, Community guidelines |
| S26 legal line (owned by auth-and-accounts.md) | By signing in you agree to the terms and privacy policy. |
| S08 host banner, hidden | This meet is under review and isn't listed right now. We'll email you within a day. |
| S32 hidden label (author) | Hidden while we review it. |
| Sign-in, suspended (owned by auth-and-accounts.md) | This account is suspended. Email hello@curbsocial.club if you think that's a mistake. |
| S23 permission checkbox | I have the venue's permission to hold this meet here. |
| S20 permission notice | Hosting here? Make sure you have the venue's permission. Listing a meet doesn't grant it. |
| Warn email subject | About your curb account |
| Warn email body | A moderator reviewed something you posted on curb and asked us to send this note: "{note}". The community guidelines are at curbsocial.club/guidelines. Reply to this email if you have a question. |
| SLA email subject | {count} open reports on curb, oldest {age} |
| A10 actions | Hide, Remove, Restore, Warn user, Suspend user, Dismiss |
| A10 empty | No open reports. |
| /guidelines sections | What curb is for. Be specific and kind. Photos: people and plates, no nudity, no violence, only what you have the right to post. Meets: have the venue's permission, no takeovers, no racing. Spots: listing isn't access. What happens when you report. Contact: hello@curbsocial.club. |
| Reviewer notes | curb hosts user content (meets, photos, comments, profiles). Every item has Report in its menu and long press; every person can be blocked from their profile; photos pass an automated check before publication; a moderation queue at /admin/reports is reviewed within 24 hours; terms are accepted at sign-in; contact hello@curbsocial.club. Demo account details follow. |

## Acceptance criteria

| Id | Given | When | Then | Proves |
|---|---|---|---|---|
| AC-1 | A visible post | Two distinct users report it, then a third, then the first user reports it again | Visible after two; hidden after the third with a `moderation_actions` row (`hide`, app account, `note: auto_hide`, `report_id` of the third) and `GET /posts/:id` 404 anonymously; the repeat returns 200 with the first report's id and the count stays 3 | R-2, R-3, R-4, R-12 |
| AC-2 | A visible user and a visible club with three open reports each | The third report is filed | Neither is hidden; both appear first in A10 | R-3 |
| AC-3 | No admin session | `GET /admin/reports` | 302 to `/admin/sign_in`; with a moderator session 200 | R-32 |
| AC-4 | A user with 20 reports today | `POST /reports` | 429 with `Retry-After`; the same call after midnight Pacific returns 201 | R-12 |
| AC-5 | A comment | `POST /reports` with `not_a_car_meet`, then with `harassment` | 422 then 201 | R-1, R-12 |
| AC-6 | A user's own event, an unknown id, and no token but an `X-Device-Id` | `POST /reports` three times | 422, 404, 201 (anonymous report stored with `device_id`); a sixth anonymous report from the same device in a day is 429 | R-12 |
| AC-7 | A user who reported event E | `GET /events` in E's area, `GET /events/:slug` for E, then the report is dismissed in A10 | E absent; detail has `viewer.reported: true`; after dismiss E is listed again | R-13 |
| AC-8 | Users A and B following each other, each with a comment on the other's post | `PUT /blocks/:b` as A, then `POST /posts/:a_post/comments` as B, then `PUT /blocks/:b` again | Follows gone both ways, each comment absent from the other's read; 403; second PUT 200 with one row | R-5, R-15 |
| AC-9 | An object with two open reports | Admin hides it from the group with a note, then restores, then dismisses a new report | Hidden with both reports `actioned` and a row carrying `report_id`; visible with a `restore` row; `dismissed` with a `dismiss` row and no other change | R-6 |
| AC-10 | A moderator session | POST remove and POST suspend | 403 for both, no rows; the same as admin returns 302 back to the queue with rows written | R-33 |
| AC-11 | A user with two sessions, one post, one hosted event | Admin suspends them | Sessions gone, `GET /me` 403 with `details.reason: suspended`, post hidden, event `hidden_at` set; lifting the suspension leaves the post hidden | R-7, R-16 |
| AC-12 | A report on a comment | Admin warns the author with a note | One Resend email enqueued containing the note, a `warn_user` row | R-8 |
| AC-13 | `FakeClassifier` and three posts labeled `nudity` 0.9, 0.7, and 0.2 | `ImageSafetyCheckJob` runs on each | Rejected and hidden with a system `hide` note naming `nudity 0.9`; visible and passed with one system report in A10 under Safety; visible and passed with no report | R-17, R-20 |
| AC-14 | The classifier raises on every call | The job runs through its retries | Post still `hidden` and `pending`, a system report `safety check failed`, one Sentry event | R-18 |
| AC-15 | A rejected post | Admin restores it from A10 | `safety_status: passed`, `status: visible`, a `restore` row | R-19 |
| AC-16 | One open report 13 h old, then only 5 h old | `ModerationSlaJob` runs | One email to each admin and moderator; then none | R-36 |
| AC-17 | A claim request body | `POST /events/:id/claims` without `venue_permission_confirmed`, then with `true` | 422 then 201 with the flag stored | R-11 |
| AC-18 | A DMCA notice naming a post URL | Admin uses act by URL to remove it | Post `removed`, a row with `report_id: null` and the note | R-35 |
| AC-19 | Device, signed out, an event card on S02 | Long press, Report, choose a reason, submit, sign in when asked | S26 opens then S33 continues; the thanks copy shows; the card is gone from the feed | R-21, R-22 |
| AC-20 | Device, signed in, another user's S11 | Block, confirm, open S27 Blocked users, Unblock | Profile shows the blocked state, the list shows the user, then the list is empty and the profile is normal | R-23 |
| AC-21 | Device, fresh install | Open S26, sign in with Apple | The terms line with both links is visible; `GET /me` shows `terms_accepted_at` | R-10, R-24 |
| AC-22 | `curl` on `/terms`, `/privacy`, `/guidelines`, and a hidden event's `/meets/:slug` | The responses are inspected | 200 for the three with the contact email and a DMCA section on `/terms`; 410 with the no longer listed page for the event | R-29, R-30 |

## Verification

| Check | How |
|---|---|
| API | `pnpm --filter @curb/api test spec/requests/api/v1/reports_spec.rb spec/requests/api/v1/blocks_spec.rb spec/models/report_spec.rb spec/models/block_spec.rb spec/policies/` |
| Auto-hide and audit | `spec/models/report_spec.rb` (AC-1, AC-2), `spec/services/moderation/action_spec.rb` (AC-9, AC-11) |
| Admin | `spec/requests/admin/reports_spec.rb` covers AC-3, AC-10, AC-18; `spec/jobs/moderation_sla_job_spec.rb` covers AC-16 |
| Safety | `spec/jobs/image_safety_check_job_spec.rb` with `FakeClassifier` (AC-13 to AC-15); the real adapter gets one recorded cassette per label once the vendor is chosen |
| Rate limit | `spec/requests/api/v1/reports_spec.rb` with rack-attack enabled and a frozen clock (AC-4) |
| Mobile | Manual on a physical iPhone in Marine Layer light: AC-19 to AC-21. Maestro flow `report_and_block.yaml` once flows exist. |
| Web | `pnpm --filter @curb/web test` Playwright on the legal pages and a hidden event (AC-22) |
| Design | Figma page "iOS Screens", frame "Report sheet" (Phase 2 design pass); the sheet is system glass, the reason list is content |

## Risks and open questions

- Gaps item 12: the builder is the moderator of record. Default: a trusted host with `role: moderator` before external TestFlight, the SLA email, and auto-hide at three so a viral week degrades to "hidden pending review", not "live and harmful".
- Gaps item 11: unauthorized locations. Default: the terms clause, the claim flag, the report reason on Event and Spot, and admin hide with a warn email to the host; one hour of legal review before public launch.
- Gaps item 3: the legal entity, the DMCA agent registration, and the policy text are outside this spec. Default: placeholders on W16 marked "draft" until counsel signs off; the App Store submission waits for final text.
- New gaps item 35 (image safety vendor). Candidates are AWS Rekognition moderation labels, Sightengine, and Hive; pick on price at beta volume (a few hundred photos per week), label coverage for the four categories, and a Ruby client; default AWS Rekognition because the R2 to S3 API shape keeps the adapter thin. Thresholds are guesses until a hundred real photos are scored; keep them in `config/safety.yml`.
- Adopted 2026-09-06 into docs/data-model.md: `events.hidden_at timestamptz`, `users.terms_accepted_at timestamptz`, `claim_requests.venue_permission_confirmed boolean default false`, and the partial unique index on `reports` (all adopted).
- Adopted 2026-09-06 into docs/api.md: `GET /me/blocks`, `viewer.reported` on detail shapes, `hidden: true` on owner reads, and `venue_permission_confirmed` in the claims body.
- The app overview lists "illegal activity" as a reason; the data model does not. Default: it folds into `inappropriate`, with `details` for specifics.
- Fail-closed safety checks mean a vendor outage stops all photos. Default: accepted at beta scale; the failed items land in A10 and an admin can restore them in bulk later if it happens.
- Reporter exclusion (R-13) adds a join to every list for signed-in users. Default: acceptable; the `(reportable_type, reportable_id, status)` index covers it and anonymous reads are unaffected.

## Session breakdown

| Slice | Deliverable | Covers | Must pass |
|---|---|---|---|
| 1 (Phase 2) | `reports`, `blocks`, `moderation_actions` models, allowed-reason table, auto-hide, `hidden_at`, `terms_accepted_at`, suspend and warn services, Pundit policies, factories | R-1 to R-10 | AC-1, AC-2, AC-9, AC-11, AC-12 (model level) |
| 2 (Phase 2) | `POST /reports` with rack-attack, blocks endpoints, `GET /me/blocks`, list exclusion, `viewer.reported`, owner reads, suspended 403, rswag specs | R-12 to R-16 | AC-4 to AC-8, AC-11 (API) |
| 3 (Phase 2) | A10 queue, group detail, actions with role split, act by URL, `ModerationSlaJob`, A02 counts, A08 moderator role | R-32 to R-37 | AC-3, AC-9, AC-10, AC-16, AC-18 |
| 4 (Phase 2) | S33 with entry points, reporter-side hide, block UI, S27 Blocked users and legal links, S26 terms line | R-21 to R-25 | AC-19 to AC-21 |
| 5 (Phase 2) | W16 pages from Markdown, 410 pages, footer link, reviewer notes text | R-28 to R-31 | AC-22 |
| 6 (Phase 4) | `Safety::Classifier` adapter and `FakeClassifier`, `ImageSafetyCheckJob`, thresholds, system reports, Safety chip, restore path | R-17 to R-20 | AC-13 to AC-15 |
| 7 (Phase 4) | Post, comment, and spot previews in A10, hidden owner states on S08 and S32 (the S23 checkbox and claims flag shipped in Phase 2 with create-and-host-tools.md slice 3) | R-26, R-27, R-34 | AC-17 (regression) |

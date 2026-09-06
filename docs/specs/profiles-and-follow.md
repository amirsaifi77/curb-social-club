# Spec: Profiles and follow

Status: draft. Phase: 2 (the public profile is read-only in Phase 1 as the user host page). Last updated: 2026-09-06.
Depends on: auth-and-accounts.md (S26, S27, default handle at sign-up, device linking), clubs.md (ClubSummary, `GET /users/:handle/clubs`), sponsors.md and event-detail-and-rsvp.md (Follow button placement), moderation-and-safety.md (Report sheet, blocked users list in S27), notifications.md (`new_follower`), photos-and-posts.md (Posts tab, Phase 4), web.md (W06). Related decisions: ADR 0010, gaps item 29.

## Summary

A profile is a person's identity on curb: handle, name, home city, a short bio, the socials they already use rendered as plain links, the clubs they belong to, and what they drive. Following works the same way on people, clubs, sponsors, and meets, and it powers the feed's following section and the Phase 4 notifications. Counts stay low pressure: follower counts appear only on host profiles, and following a club is not membership (gaps item 29). Blocking is complete and quiet: both parties stop seeing each other in going lists, member lists, comments, and the feed.

## User stories

| Id | Story |
|---|---|
| US-1 | As a browser, I want to open a host's profile from a meet card so that I know who runs it and what else they do. |
| US-2 | As a member, I want to set my handle, name, home city, bio, and socials so that people at the meet can find me where I already post. |
| US-3 | As a member, I want to add what I drive so that my profile says something without a bio. |
| US-4 | As a member, I want to follow a host, club, sponsor, or meet so that their new dates and posts reach my feed and notifications. |
| US-5 | As a member, I want one place to see and manage everything I follow so that I can prune it. |
| US-6 | As a member, I want to block someone so that we do not see each other on curb. |
| US-7 | As a browser, I want a profile page on the web so that a link from a meet unfurls and reads without the app. |

## Scope

In Phase 1: S11 and W06 read-only (avatar, handle, display name, home city, bio, socials, host badge, hosted meets) as the user host page; `GET /users/:handle`, `GET /users/:handle/events`.

In Phase 2: the Me tab (S07) signed-out and signed-in; Edit profile (S28) with handle rules and an availability check, avatar upload, coarse home location, socials; Garage (S29) through `/me/vehicles`; clubs section from `GET /users/:handle/clubs`; Following tab and Going tab on S11; Follow on User, Club, Sponsor, Event through `PUT` and `DELETE /follows` with counter caches, the signed-out flow, and the offline queue; the Following screen (S31); Block through `PUT` and `DELETE /blocks/:user_id` and its effects.

Not in this phase: Posts tab and `counts.posts` (Phase 4, photos-and-posts.md); follow-based and new-follower notifications (Phase 4, notifications.md); garage badges on RSVP avatars (Later); `profiles.visibility: private` (Later; the column exists, the toggle does not ship, and every read treats profiles as public); the Report sheet (moderation-and-safety.md); web edit and follow (Phase 7, W17).

## Requirements

**Data**

- R-1 `profiles.handle` MUST be 3 to 24 chars matching `^[a-z0-9_]+$`, stored lowercase (citext), unique, and MUST NOT be one of the reserved words `admin`, `curb`, `curbsocial`, `support`, `hello`, `help`, `me`, `settings`, `new`, `meets`, `clubs`, `sponsors`, `spots`. (US-2)
- R-2 `profiles.links` MUST accept only the keys `instagram`, `youtube`, `tiktok`, `x`, `threads`, `website`; MUST store handles without a leading `@`; and MUST validate on write with `instagram` and `threads` `^[A-Za-z0-9._]{1,30}$`, `tiktok` `^[A-Za-z0-9._]{1,24}$`, `x` `^[A-Za-z0-9_]{1,15}$`, `youtube` `^[A-Za-z0-9._-]{3,30}$`, and `website` an `http` or `https` URL of at most 200 chars with a host. (US-2)
- R-3 `profiles.display_name` MUST be 1 to 40 chars, `bio` at most 280, `home_label` at most 60, and `home_location` MUST be stored with at most 2 decimal places of precision. (US-2)
- R-4 `vehicles` MUST require `make` and `model`, MUST bound `year` to 1900 through next year, MUST keep at most one `is_primary` per user, MUST cap `photos` at 4, and MUST hold `position` unique per user. (US-3)
- R-5 A `follows` row MUST be unique on `(follower_id, followable_type, followable_id)`, MUST reject `followable_type: User` where the target is the follower, and MUST maintain `profiles.followers_count`, `profiles.following_count`, `clubs.followers_count`, `sponsors.followers_count`, and `events.followers_count` by counter cache. (US-4)
- R-6 Creating a `blocks` row MUST delete `follows` in both directions between the two users in the same transaction. (US-6)

**API**

- R-7 `GET /users/:handle`, `GET /users/:handle/events`, `GET /users/:handle/vehicles`, and `GET /users/:handle/clubs` MUST work without a token and MUST return the Profile, EventSummary, Vehicle, and ClubSummary (with `role`) shapes in `docs/api.md`; a `suspended` or `deleted` user MUST return 404. (US-1)
- R-8 The Profile `counts` MUST include `followers`, `following`, `events_hosted` (published events with `host_type: User`), `vehicles`, and `posts` (0 until Phase 4); `viewer` MUST include `following`, `blocked`, and `is_self`, all false for anonymous viewers. (US-1)
- R-9 `PATCH /me` MUST accept `profile.handle`, `display_name`, `bio`, `home_location`, `home_label`, `links`, and `avatar_blob_id`, MUST return 422 `validation_failed` with `details.handle: ["taken"]` or `["reserved"]` or `["invalid"]`, and `details.links.<key>: ["invalid"]`, and MUST round `home_location` server-side to 2 decimals. (US-2)
- R-10 `GET /me/vehicles`, `POST /me/vehicles`, `PATCH /me/vehicles/:id`, and `DELETE /me/vehicles/:id` MUST operate only on the caller's rows (404 otherwise) and MUST accept `photo_blob_ids[]` from `POST /uploads/direct`. (US-3)
- R-11 `PUT /follows` and `DELETE /follows` MUST be idempotent (200 with `{ following: bool, followers_count }` both times), MUST return 404 for a hidden club or sponsor or an unlisted event the viewer cannot see, MUST return 403 when a block exists in either direction, and MUST return 422 for a self follow. (US-4)
- R-12 `GET /me/following` MUST accept `type` in `user`, `club`, `sponsor`, `event`, MUST return Host shapes for the first three and EventSummary for events, newest follow first, cursor paginated. (US-5)
- R-13 `PUT /blocks/:user_id` and `DELETE /blocks/:user_id` MUST be idempotent (204), MUST return 422 for self, and the following reads MUST exclude users on either side of a block for the viewer: `GET /occurrences/:id/attendees`, `GET /clubs/:slug/members`, the `following` feed section, `GET /users/:handle/posts` (Phase 4), and comments (Phase 4); counter caches such as `going_count` MUST stay unchanged. (US-6)
- R-14 `GET /users/:handle` for a pair with a block in either direction MUST return 200 with a reduced Profile (`handle`, `display_name`, `avatar_url`, `viewer.blocked: true`; `bio`, `links`, `home_label`, `clubs`, and `counts` null), and every sub-resource of that user (`events`, `vehicles`, `clubs`, `rsvps`) MUST return an empty list. (US-6)
- R-15 `GET /users/:handle/rsvps` MUST return upcoming Occurrence rows with `status: going`, newest first, and MUST respect blocks. (US-1)

**Mobile**

- R-16 Tapping a host chip of type `user`, an avatar in a going list, member list, or comment, or a `curb://u/<handle>` link MUST open S11. (US-1)
- R-17 S11 MUST render avatar, display name, handle, home label (city only), host badge when `is_host`, bio, a socials row of icon links from `links`, a Clubs section of ClubSummary chips with an Owner or Admin label, a Garage row of vehicle cards, and tabs Going, Posts (Phase 4), Following; the followers count MUST appear only when `is_host` is true, and the following count MUST never appear on another person's profile. (US-1)
- R-18 A social icon MUST open `https://instagram.com/<h>`, `https://youtube.com/@<h>`, `https://tiktok.com/@<h>`, `https://x.com/<h>`, `https://threads.net/@<h>`, or the website URL through `Linking.openURL`, so iOS routes to the native app when installed and otherwise Safari; the website opens in `expo-web-browser`; no OAuth or in-app login is ever offered. (US-2)
- R-19 S11 MUST show Follow (Following when `viewer.following`) for others and Edit profile for self, an overflow menu with Share, Report (moderation-and-safety.md), and Block, and MUST render the blocked state from R-14 with no Follow and no tabs. (US-1, US-6)
- R-20 S07 signed out MUST show only the sign-in card and a Settings row; signed in it MUST show the user's own header (as S11 self) and rows for Edit profile, Garage, Going, Following, My meets (`GET /me/events`), Claims (`GET /me/claims`), Notifications (the S27 section until S30 ships in Phase 4), and Settings. (US-2)
- R-21 S28 MUST validate the handle on device with R-1, MUST probe availability with a debounced (400 ms) `GET /users/:handle` where 404 means available, MUST treat the `PATCH /me` 422 as the authority, and MUST show the handle preview `curbsocial.club/u/<handle>`. (US-2)
- R-22 S28 MUST crop the avatar square on device (max 2048 px), upload through `POST /uploads/direct`, and send `avatar_blob_id`; MUST set the home area by city search with `expo-location` `geocodeAsync` rounded to 2 decimals plus a `home_label` of "City, ST"; and MUST strip `@` and whitespace from socials before validating with R-2 and show per-field errors. (US-2)
- R-23 S29 MUST list vehicles by `position`, MUST add and edit with year, make, model, trim, nickname, color, description, up to 4 photos, and Primary, MUST reorder by drag, and MUST confirm before delete. (US-3)
- R-24 Follow MUST toggle optimistically with the PrimaryButton (Follow, Following; no Confirmed moment), MUST call `PUT` or `DELETE /follows`, MUST open S26 first when signed out and complete afterward, and MUST queue offline with the queued caption and replay in order on reconnect. (US-4)
- R-25 Every surface with a Follow control (S11, S12, S14, S08) MUST use one `useFollow(followable)` hook from `packages/ui` so the queue, optimistic state, and cache updates live in one place. (US-4)
- R-26 S31 MUST list `GET /me/following` with a segmented filter All, People, Clubs, Sponsors, Meets, each row with a Following toggle, and MUST show the empty copy per filter. (US-5)
- R-27 Block from S11 MUST confirm with the effects listed, MUST call `PUT /blocks/:user_id`, MUST leave the user on the reduced profile, and unblock MUST live in the Blocked users list in S27 (moderation-and-safety.md) calling `DELETE /blocks/:user_id`. (US-6)

**Web**

- R-28 W06 MUST server-render the Phase 1 profile with `og:title` (display name), `og:description` (bio or "Hosts meets in {home_label}"), `og:image` (avatar or the flat placeholder), socials as `rel="nofollow noopener"` anchors, hosted meets, clubs, and garage; Follow MUST open the app or the store link; the blocked state does not apply (anonymous). (US-7)

**Admin and jobs**

- R-29 None: profile edits and blocks need no job; admin edits of users are A08 in admin.md. (US-6)

## Data

`profiles` (`handle`, `display_name`, `bio`, `avatar`, `home_location`, `home_label`, `is_host`, `links`, `followers_count`, `following_count`, `visibility` read as `public`), `vehicles`, `follows`, `blocks`, `club_memberships` (read for the clubs section), `rsvps` (Going tab). Migrations: slice 2 creates `vehicles`, slice 3 creates `follows` (`blocks` is created by moderation-and-safety.md slice 1, which runs first in Phase 2); a reserved-handle list lives in `config/reserved_handles.yml`.

## API

Read: `GET /users/:handle`, `GET /users/:handle/events`, `GET /users/:handle/vehicles`, `GET /users/:handle/clubs`, `GET /users/:handle/rsvps`, `GET /me`, `GET /me/vehicles`, `GET /me/following`, `GET /me/rsvps`, `GET /me/events`, `GET /me/claims`.

Write: `PATCH /me`, `POST /me/vehicles`, `PATCH /me/vehicles/:id`, `DELETE /me/vehicles/:id`, `PUT /follows`, `DELETE /follows`, `PUT /blocks/:user_id`, `DELETE /blocks/:user_id`, `POST /uploads/direct`.

Deltas this spec assumes (Risks): `GET /users/:handle/rsvps`; `PUT` and `DELETE /follows` respond with `{ following, followers_count }`; `photo_blob_ids[]` on vehicles.

## Screens and states

| Screen id | Screen | Route (mobile / web) | Primary actions | States |
|---|---|---|---|---|
| S11 | Profile | `u/[handle]` / `/u/:handle` | Follow, open a club, open a meet, Share, Report, Block | loading, error, offline, not found, blocked, self, signed-out on Follow, empty garage, empty tabs |
| S07 | Me (tab) | `(tabs)/me` / `/u/:handle` (own) | Edit profile, Garage, Going, Following, My meets, Claims, Settings | signed-out, loading, offline |
| S28 | Edit profile | `settings/profile` / none | Save | validation, handle taken, handle checking, invalid social handle, upload progress, offline, error |
| S29 | Garage | `me/garage`, `me/garage/[id]` / `/u/:handle` (section) | Add a car, edit, reorder, delete | loading, empty, validation, upload progress, offline |
| S31 | Following | `me/following` / none | Filter, unfollow | loading, empty (per filter), error, offline |
| W06 | Profile | `/u/:handle` | Open a meet, Follow (opens app) | loading (SSR, none), not found |

## Copy

| Where | String |
|---|---|
| S11 host badge | Host |
| S11 counts, host | 128 followers. 3 meets. |
| S11 counts, self | 12 following |
| S11 clubs role labels | Owner, Admin |
| S11 clubs empty | Not in a club yet. |
| S11 garage empty, self | Your garage is empty. Add what you drive. Daily drivers count. |
| S11 garage empty, other | Nothing in the garage yet. |
| S11 Going empty, self | You're not going to anything yet. This weekend's meets are on Home. |
| S11 Going empty, other | Not going to anything listed. |
| S11 Following empty, self | You're not following anyone. Follow a host and their meets show up here first. |
| S11 Following empty, other | Not following anyone yet. |
| S11 not found | This profile isn't here. |
| S11 blocked | Nothing to show here. |
| S11 overflow | Share profile, Report, Block @{handle} |
| S11 block confirm | Block @{handle}? You won't see each other in going lists, comments, or the feed, and you'll stop following each other. (Block / Cancel) |
| S07 signed out | Sign in to mark yourself going, post photos, and follow hosts. Browsing is always free. (Sign in) |
| S07 rows | Edit profile, Garage, Going, Following, My meets, Claims, Notifications, Settings |
| S28 handle helper | Letters, numbers, and underscores. 3 to 24. curbsocial.club/u/{handle} |
| S28 handle checking | Checking |
| S28 handle available | Available |
| S28 handle taken | That handle is taken. |
| S28 handle reserved | That one's reserved. |
| S28 handle invalid | Lowercase letters, numbers, and underscores only. |
| S28 home helper | City only. We use it to sort the map, and it's all anyone sees. |
| S28 socials header | Where else to find you |
| S28 socials helper | Handles, no @. Shown as links on your profile. |
| S28 social invalid | That doesn't look like a {platform} handle. |
| S28 website invalid | Include https://. |
| S28 bio counter | {n} of 280 |
| S28 saved toast | Saved. |
| S28 offline | You're offline. Changes will save when you're back. |
| S29 title, add | Garage, Add a car |
| S29 primary label | Daily |
| S29 delete confirm | Remove the {year} {make} {model}? (Remove / Keep) |
| S29 validation | Year, make, and model are needed. |
| S31 filters | All, People, Clubs, Sponsors, Meets |
| S31 empty, People | You're not following anyone yet. |
| S31 empty, Clubs | No clubs yet. Clubs near you are on Home. |
| S31 empty, Sponsors | No sponsors yet. |
| S31 empty, Meets | No meets yet. Follow one to hear when a date changes. |
| Follow button, queued caption | Saved on this phone. Will sync when you're back online. |
| Follow button, error caption | Couldn't save. Check your connection. |
| Follow, blocked (403) | You can't follow this account. |

## Acceptance criteria

| Id | Given | When | Then | Proves |
|---|---|---|---|---|
| AC-1 | A user with two vehicles, one active club membership as admin, three hosted events, and `is_host` true | `GET /users/:handle` without a token | 200 Profile with `links` keys, `clubs[0].role: "admin"`, `counts.events_hosted: 3`, `counts.vehicles: 2`, `viewer` all false | R-7, R-8 |
| AC-2 | A suspended user | `GET /users/:handle` | 404 | R-7 |
| AC-3 | A signed-in user | `PATCH /me` with handle `Admin`, then `a`, then `taken_one` (existing), then `back_bay_amir` | 422 `reserved`, 422 `invalid`, 422 `taken`, 200 with the handle stored lowercase | R-1, R-9 |
| AC-4 | A signed-in user | `PATCH /me` with `links: { instagram: "@back.bay", x: "toolonghandle_1234", website: "backbay.coffee" }` | 422 with `details.links.x` and `details.links.website`; a retry with `instagram: "back.bay"` and `website: "https://backbay.coffee"` stores `instagram` without the `@` | R-2, R-9 |
| AC-5 | A signed-in user | `PATCH /me` with `home_location: { lat: 33.61847, lng: -117.92892 }` | Stored as 33.62, -117.93 | R-3, R-9 |
| AC-6 | A user with one primary vehicle | `POST /me/vehicles` with `is_primary: true` and 5 `photo_blob_ids` | 422 for photos; with 4 photos 201 and the older vehicle's `is_primary` is false | R-4, R-10 |
| AC-7 | A signed-in user and a club | `PUT /follows { followable_type: "Club", followable_id }` twice, then `DELETE` twice | 200 each time; one row after the PUTs, none after the DELETEs; `clubs.followers_count` goes 1 then 0; `profiles.following_count` matches | R-5, R-11 |
| AC-8 | A signed-in user | `PUT /follows` with their own user id; then with a hidden club | 422; 404 | R-5, R-11 |
| AC-9 | A follows B, B follows A | `PUT /blocks/:B` as A | 204; both follows are gone; `PUT /follows` from B to A returns 403; `GET /users/:A` as B is the reduced Profile with `viewer.blocked: true` | R-6, R-11, R-13, R-14 |
| AC-10 | A blocked B, both going to the same occurrence | `GET /occurrences/:id/attendees` as A and as B; `GET /occurrences/:id` | Each list omits the other; `going_count` is unchanged | R-13 |
| AC-11 | A user following one user, two clubs, one sponsor, one event | `GET /me/following?type=club` and without `type` | Two ClubSummary-bearing Host rows; five rows newest first | R-12 |
| AC-12 | Device, a meet card with a user host | The host chip is tapped | S11 opens with the handle in the header; the followers count is visible because `is_host` is true; a non-host profile shows none | R-16, R-17 |
| AC-13 | Device, a profile with `links.instagram` and `links.website` | Each icon is tapped | Instagram opens the Instagram app (or Safari when not installed); the website opens the in-app browser | R-18 |
| AC-14 | Device, S11 signed out | Follow is tapped | S26 opens; after sign-in the button reads Following and `viewer.following` is true on refetch | R-24, signed-out state |
| AC-15 | Device, airplane mode on S12 | Follow is tapped, then airplane mode off | The button shows Following with the queued caption; after reconnect the caption clears and the server has the row | R-24, R-25 |
| AC-16 | Device, S28 | The handle field receives `taken_one`, then `new_handle_ok` | Checking, then "That handle is taken."; then Available; Save succeeds and S11 shows the new handle | R-21 |
| AC-17 | Device, S29 with two cars | The second is dragged above the first and the first is deleted after confirm | `position` values are swapped on `GET /me/vehicles`; one car remains | R-23 |
| AC-18 | W06 fetched with curl for a host with an avatar | The HTML is inspected | `og:title` is the display name, `og:image` is the avatar URL, social anchors carry `rel="nofollow noopener"` | R-28 |

## Verification

| Check | How |
|---|---|
| API | `pnpm --filter @curb/api test spec/requests/api/v1/users_spec.rb spec/requests/api/v1/me_spec.rb spec/requests/api/v1/vehicles_spec.rb spec/requests/api/v1/follows_spec.rb spec/requests/api/v1/blocks_spec.rb spec/models/profile_spec.rb spec/models/follow_spec.rb spec/models/block_spec.rb` |
| Block effects elsewhere | AC-10 lives in `spec/requests/api/v1/occurrences_spec.rb`; clubs.md AC-4 covers members |
| Shared hook | `pnpm --filter @curb/ui test` for `useFollow` (optimistic, queue replay order, 403 rollback) |
| Mobile | Manual on a physical iPhone in Marine Layer light and Olive and Ivory dark: AC-12 to AC-17. Maestro flows `profile_follow.yaml`, `edit_profile.yaml` once flows exist |
| Web | `pnpm --filter @curb/web test` Playwright smoke on `/u/:handle` asserting AC-18 |
| Design | Figma page "iOS Screens", frames "Profile", "Edit profile", "Garage", "Following" (Phase 2 design pass); flat rendering check per design-system-and-theming.md |

## Risks and open questions

- Adopted 2026-09-06 into docs/api.md: add `GET /users/:handle/rsvps` (anon, upcoming `going` occurrences, respects blocks) so the Going tab works on other people's profiles; `GET /me/rsvps` covers self only.
- Adopted 2026-09-06 into docs/api.md: `PUT` and `DELETE /follows` return `{ following, followers_count }` so the client can settle counts without a refetch.
- Adopted 2026-09-06 into docs/api.md: `POST` and `PATCH /me/vehicles` accept `photo_blob_ids[]`.
- The handle availability probe reuses `GET /users/:handle`; a suspended user's handle probes as available and is caught by the `PATCH /me` 422. Acceptable; no new endpoint.
- Gaps item 29: no follower counts on non-host profiles and identical layouts for everyone. Default as written in R-17.
- The app overview puts "follow people" in Phase 4; the brief's phase plan puts follow for all four types in Phase 2. Default: Phase 2 for the mechanics, Phase 4 for the notifications and the following feed section that depend on posts.
- `profiles.visibility: private` is Later. Default: the column stays `public`, no toggle in S27, and every read in this spec ignores it. When it ships, R-13's exclusion list is where the visibility check belongs.
- Reserved handles: the list in `config/reserved_handles.yml` should grow with every new top-level route; web.md adds `socal`, `og`, `posts`, `map`.

## Session breakdown

| Slice | Deliverable | Covers | Must pass |
|---|---|---|---|
| 1 (Phase 1) | Profile validations (handle, links, sizes, reserved list), `GET /users/:handle` family with counts and `viewer`, W06 SSR with OG tags | R-1 to R-3, R-7, R-8, R-28 | AC-1, AC-2, AC-18 |
| 2 (Phase 2) | `PATCH /me` with avatar and rounding, vehicles CRUD with photo caps and primary rule | R-4, R-9, R-10 | AC-3 to AC-6 |
| 3 (Phase 2) | `follows` model, counter caches, `PUT` and `DELETE /follows`, `GET /me/following`, `viewer.following` on Profile, Club, Sponsor, Event | R-5, R-11, R-12 | AC-7, AC-8, AC-11 |
| 4 (Phase 2) | `blocks` model, endpoints, reduced Profile, exclusion in attendees and members, `GET /users/:handle/rsvps` | R-6, R-13 to R-15 | AC-9, AC-10 |
| 5 (Phase 2) | S11 full layout (socials, clubs, garage, tabs, overflow, blocked), S07 both states, host chip navigation | R-16 to R-20 | AC-12, AC-13 |
| 6 (Phase 2) | S28 edit profile with probe, avatar crop and upload, home city, socials; S29 garage | R-21 to R-23 | AC-16, AC-17 |
| 7 (Phase 2) | `useFollow` hook with queue, Follow button on S11, S12, S14, S08; S31; Block flow on S11 | R-24 to R-27 | AC-14, AC-15 |

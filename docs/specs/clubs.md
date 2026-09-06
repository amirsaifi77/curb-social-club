# Spec: Clubs

Status: draft. Phase: 1 (pages, club as host), 2 (follow), 7 (membership and management). Last updated: 2026-09-06.
Depends on: events-and-occurrences.md, profiles-and-follow.md (follow), admin.md (club CRUD at launch). Related decisions: ADR 0010, gaps items 5 and 29.

## Summary

A club is a group of people who organize or attend meets together: a marque club, a neighborhood crew, a photography collective. Clubs have a page, can host one-off and recurring meets, can be followed by anyone, and can be joined by members. At launch clubs are seeded and edited by the admin and their pages are read-only; membership, invites, and in-app and web management arrive after launch. Clubs are not a velvet rope: every club is visible, following is always open, and joining is optional (gaps item 29).

## User stories

| Id | Story |
|---|---|
| US-1 | As a browser, I want to open a club's page from a meet card so that I know who runs the meet and what else they organize. |
| US-2 | As a browser, I want to see clubs near me so that I can find the groups that meet in my area. |
| US-3 | As a member, I want to follow a club so that its new meets and posts reach my feed and notifications. |
| US-4 | As a browser, I want to see a club's members so that I recognize people at the meet. |
| US-5 | As a club owner (post-launch), I want to publish meets as the club so that the meet carries the club's name, not mine. |
| US-6 | As a member (post-launch), I want to join an open club in one tap, or redeem an invite for an invite-only club, so that my profile shows the clubs I belong to. |
| US-7 | As a club owner (post-launch), I want to invite people, promote admins, and edit the club on my phone or on the web so that I can run the club without the app owner. |

## Scope

In Phase 1: `clubs` and `club_memberships` tables; club as an event host (`host_type: Club`); read-only club page (S12) and members list (S13) on mobile; club page (W08) and directory (W07) on web; "clubs near you" section in the feed; club search; admin CRUD for clubs and memberships, including seeding owners.

In Phase 2: Follow button on the club page (mechanics in profiles-and-follow.md); clubs section on user profiles; claim a meet as a club when the claimant is an owner or admin of a seeded club.

In Phase 7 (post-launch): create a club in the app; join open clubs; invite by handle and by rotating invite link; request to join invite-only clubs; roles (owner, admin, member); manage screen on mobile (S36) and web; transfer ownership; leave a club; club posts tab.

Not in this spec: sponsors (sponsors.md), event creation UI (create-and-host-tools.md), notifications for club activity (notifications.md), moderation of club content (moderation-and-safety.md).

## Requirements

**Data**

- R-1 A club MUST have a unique `slug`, a `name`, a `join_policy` of `open` or `invite_only`, and a `status` of `active` or `hidden`, per `docs/data-model.md`. (US-1)
- R-2 An event MUST be able to name a club as its host (`host_type: Club`), and the event's `host_name` MUST be updated when the club is renamed. (US-5)
- R-3 A club MUST have exactly one `owner` membership; the model MUST reject a second owner and MUST reject removing the last one. (US-7)
- R-4 `members_count` MUST count only `active` memberships; `followers_count` and `events_count` are counter caches maintained by callbacks. (US-4)
- R-5 A hidden club MUST return 404 on every public endpoint and MUST NOT appear in feed, search, or directory results; its events remain visible with the club as host. (US-1)

**API**

- R-6 `GET /clubs`, `GET /clubs/:slug`, `GET /clubs/:slug/events`, and `GET /clubs/:slug/members` MUST work without a token and MUST return the shapes in `docs/api.md`. (US-1, US-2, US-4)
- R-7 `GET /clubs` with `near` MUST order by distance and include `distance_m`; without `near` it MUST order by `followers_count` descending. (US-2)
- R-8 `GET /clubs/:slug/members` MUST exclude users blocked by or blocking the viewer and MUST paginate with the standard cursor. (US-4)
- R-9 The `Club` shape MUST include `viewer.following`, `viewer.membership`, and `viewer.can_manage`, all false or null for anonymous viewers. (US-3, US-7)
- R-10 Every club write endpoint listed in `docs/api.md` MUST exist and MUST return 403 with code `not_enabled` until Phase 7 turns them on behind a feature flag `clubs_self_service`. (US-6, US-7)
- R-11 In Phase 7, `PUT /clubs/:id/membership` MUST create an `active` membership for `open` clubs, MUST require a valid `invite_code` for `invite_only` clubs, and MUST be idempotent. (US-6)
- R-12 In Phase 7, only the owner MAY promote to `admin` or transfer `owner`; admins MAY invite and remove members but not other admins. (US-7)
- R-13 `POST /events` with `host: { type: "club", id }` MUST require an `owner` or `admin` membership and MUST otherwise return 403. (US-5)

**Mobile**

- R-14 Tapping a host chip of type `club` anywhere in the app MUST open S12. (US-1)
- R-15 S12 MUST show banner, avatar, name, verified badge, home label, description, links, member count with the first eight avatars, follower count, upcoming meets (up to three, with a "See all" link to a filtered List), and a Follow button (Phase 2). (US-1, US-3, US-4)
- R-16 S13 MUST list active members with role labels for owner and admin, paginated. (US-4)
- R-17 The feed MUST show a "Clubs near you" section (up to six ClubSummary cards) when at least one active club with a `home_location` is within the browse radius. (US-2)
- R-18 Search MUST return clubs as a group under events, matched on `name` with trigram similarity. (US-2)
- R-19 In Phase 7, S36 MUST let a manager edit name, description, avatar, banner, links, join policy, and home location; invite by handle; rotate the invite link; change roles; remove members; and, for the owner, transfer ownership. (US-7)
- R-20 In Phase 7, S37 MUST redeem an invite link for a signed-in user and MUST open the sign-in sheet first for a signed-out one, then complete the join. (US-6)

**Web**

- R-21 W08 MUST server-render the same content as S12 with `og:title`, `og:description`, `og:image` (banner or a flat brand placeholder), and a JSON-LD `Organization`. (US-1)
- R-22 W07 MUST list active clubs, nearest first when a region is known, else by followers, and MUST be in the sitemap. (US-2)

**Admin and jobs**

- R-23 Admin MUST be able to create, edit, hide, and verify clubs, and add or remove memberships with roles, at launch (admin.md A05). (US-5)
- R-24 A nightly `HostConsistencyJob` MUST report events whose `host_type: Club` points at a missing or hidden club. (US-1)

## Data

`clubs`, `club_memberships` (new in the Phase 1 host migration), `events.host_type`, `events.host_id`, `events.host_name`, `follows` with `followable_type: Club`, `claim_requests.claim_as_type: Club`. Feature flag `clubs_self_service` lives in `config/features.yml` (a plain hash read at boot; no gem).

## API

Read: `GET /clubs`, `GET /clubs/:slug`, `GET /clubs/:slug/events`, `GET /clubs/:slug/members`, `GET /users/:handle/clubs`, `GET /me/clubs`, `GET /feed` (`clubs_nearby` section).

Write (Phase 2): `PUT /follows` with `followable_type: Club`. `POST /events` with `host.type: club`. `POST /events/:id/claims` with `claim_as.type: club`.

Write (Phase 7, behind `clubs_self_service`): `POST /clubs`, `PATCH /clubs/:id`, `PUT /clubs/:id/membership`, `DELETE /clubs/:id/membership`, `POST /clubs/:id/invites`, `POST /clubs/:id/invite_code`, `PATCH /clubs/:id/members/:user_id`, `DELETE /clubs/:id/members/:user_id`.

## Screens and states

| Screen id | Screen | Route (mobile / web) | Primary actions | States |
|---|---|---|---|---|
| S12 | Club page | `clubs/[slug]` / `/clubs/:slug` | Follow (2), See all meets, open a member, share | loading, error, offline, hidden (no longer listed), signed-out on Follow, member view (7), manager view (7) |
| S13 | Club members | `clubs/[slug]/members` / section of `/clubs/:slug` | Open a profile | loading, empty, error, offline |
| W07 | Club directory | `/clubs` | Open a club | loading (SSR, none), empty |
| S36 | Club manage | `clubs/[slug]/manage` / `/clubs/:slug/manage` | Edit, invite, roles, transfer | Phase 7: not enabled, validation, offline |
| S37 | Invite redemption | `clubs/join/[code]` / `/clubs/join/:code` | Join | Phase 7: invalid code, already a member, signed-out |

## Copy

| Where | String |
|---|---|
| S12 header, verified | Verified club |
| S12 members row | 24 members. Owner and two admins. |
| S12 upcoming empty | No meets listed yet. Follow to hear when one is. |
| S12 join policy, open (7) | Open to join |
| S12 join policy, invite (7) | By invitation |
| S12 hidden | This club is no longer listed. |
| S13 empty | No members listed yet. |
| Feed section title | Clubs near you |
| Search group title | Clubs |
| W07 title | Clubs in Southern California |
| S36 not enabled | Club tools are coming after launch. Until then, email hello@curbsocial.club to update your club. |
| S37 invalid | This invite link has expired. Ask the club for a new one. |
| S37 already member | You are already in this club. |
| Follow button | Follow, Following |

## Acceptance criteria

| Id | Given | When | Then | Proves |
|---|---|---|---|---|
| AC-1 | A seeded active club with three upcoming events | `GET /clubs/:slug` without a token | 200 with the Club shape, `upcoming_events` has three EventSummary entries, `viewer` fields are false or null | R-6, R-9 |
| AC-2 | A club with `status: hidden` that hosts a published event | `GET /clubs/:slug`, `GET /clubs`, `GET /events/:slug` for its event | 404, the club is absent from the list, the event returns 200 with `host.type: club` | R-5 |
| AC-3 | Three clubs with home locations at 2, 10, and 60 km from `near` | `GET /clubs?near=lat,lng&radius_km=40` | Two clubs, ordered 2 km then 10 km, each with `distance_m` | R-7 |
| AC-4 | A club whose members include a user the viewer has blocked | `GET /clubs/:slug/members` with the viewer's token | The blocked user is absent; `members_count` on the club is unchanged | R-8 |
| AC-5 | A club with one owner | A second membership is saved with `role: owner`, or the owner's membership is destroyed | Validation error in both cases | R-3 |
| AC-6 | A club is renamed in the admin UI | The rename is saved | Every event with that club as host has the new `host_name` | R-2 |
| AC-7 | `clubs_self_service` is off | `PUT /clubs/:id/membership` with a valid token | 403 with `error.code` `not_enabled` | R-10 |
| AC-8 | A member with no membership in club X | `POST /events` with `host: { type: "club", id: X }` | 403 | R-13 |
| AC-9 | The feed is requested with `near` inside 40 km of two active clubs | `GET /feed` | A `clubs_nearby` section with two ClubSummary items | R-17 |
| AC-10 | A meet card whose host is a club, on device | The host chip is tapped | S12 opens with the club's name in the header within one navigation | R-14 |
| AC-11 | S12 on device, signed out | Follow is tapped | The sign-in sheet opens; after sign-in the button reads Following | R-15, signed-out state |
| AC-12 | W08 fetched with curl | The HTML is inspected | `og:title` equals the club name, `og:image` is set, JSON-LD `Organization` is present | R-21 |
| AC-13 | Phase 7: an open club and a signed-in non-member | `PUT /clubs/:id/membership` twice | 200 both times, one `active` membership | R-11 |
| AC-14 | Phase 7: an invite-only club and a signed-in non-member without a code | `PUT /clubs/:id/membership` | 403 | R-11 |
| AC-15 | Phase 7: an admin (not owner) | `PATCH /clubs/:id/members/:user_id` with `role: admin` | 403 | R-12 |

## Verification

| Check | How |
|---|---|
| API | `pnpm --filter @curb/api test spec/requests/api/v1/clubs_spec.rb spec/models/club_spec.rb spec/models/club_membership_spec.rb` |
| Feed section | `spec/requests/api/v1/feed_spec.rb` covers AC-9 |
| Mobile | Manual on a physical iPhone in Marine Layer light: open a club from a meet card, scroll S12, open S13, tap Follow signed out. Maestro flow `club_page.yaml` once flows exist. |
| Web | `pnpm --filter @curb/web test` Playwright smoke on `/clubs/:slug` asserting AC-12 |
| Design | Figma page "iOS Screens", frame "Club" (to be added in the Phase 1 design pass); flat rendering check per design-system-and-theming.md |

## Risks and open questions

- Gaps item 29: the club page must read as welcoming, not as a members-only wall. Default: identical layout for open and invite-only clubs; the join policy is a small label, never a gate on viewing.
- Seeded clubs have no consenting owner. Default: seeded clubs carry the app account as owner until a claim (Phase 2) or a Phase 7 handoff; the club page shows no "Owner" label when the owner is the app account.
- Whether a club can have events at multiple venues with different recurrence rules is already handled: each event is its own record with the club as host.
- Club privacy (hidden member lists) is not planned. If a club asks, add `members_visibility` later.

## Session breakdown

| Slice | Deliverable | Covers | Must pass |
|---|---|---|---|
| 1 (Phase 1, with the host migration) | `clubs` and `club_memberships` tables, models, validations, counter caches, `HostConsistencyJob`, factories | R-1 to R-5, R-24 | AC-2 (model part), AC-5, AC-6 |
| 2 (Phase 1) | Read endpoints, serializers, rswag specs, feed section, search group, stubbed write endpoints returning `not_enabled`, `EventPolicy` rule for club hosts (policy spec only; `POST /events` is Phase 2) | R-6 to R-10, R-13, R-17, R-18 | AC-1 to AC-4, AC-7, AC-9 |
| 3 (Phase 1) | Admin CRUD for clubs and memberships (admin.md A05) and CSV seed columns | R-23 | Admin spec ACs |
| 4 (Phase 1) | S12 and S13 on mobile, host chip navigation, feed section card | R-14 to R-16 | AC-10 |
| 5 (Phase 1) | W07 and W08 with OG tags and JSON-LD, sitemap entries | R-21, R-22 | AC-12 |
| 6 (Phase 2) | Follow button wiring, clubs section on profiles, claim as club, `POST /events` with a club host | R-15 (Follow), R-13 | AC-8, AC-11 |
| 7 to 9 (Phase 7) | Self-service endpoints behind the flag, S36, S37, web manage page | R-11, R-12, R-19, R-20 | AC-13 to AC-15 |

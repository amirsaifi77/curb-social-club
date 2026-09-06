# Screen Inventory

Status: v0.1, 2026-09-06. Every screen in the iOS app, the public web app, and the admin UI, with its route, the spec that owns it, the phase it ships in, and the states it must implement. Specs cite screens by id. `docs/app-overview.md` describes the same surfaces in prose; when they disagree, this table wins for routes and phases and the spec wins for behavior.

## Navigation

The iOS app has four Liquid Glass tabs: Home (feed), Map, Create (center action), Me. This resolves the earlier five-tab sketch in `apps/mobile/README.md`; notifications live behind a bell in the Home header and under Me, not in a tab. Search is a glass search field pinned above Home and Map and opens the Search screen. Every detail screen is reachable by deep link (`curb://` and universal links) and by web URL, so the mobile route and the web path are listed together.

Expo Router paths are relative to `apps/mobile/app/`. Web paths are React Router routes in `apps/web/app/routes/`. Admin paths are Rails routes on the API host.

## Standard states

| State | Rule |
|---|---|
| loading | Skeleton that matches the final layout. Never a full-screen spinner. |
| empty | A specific sentence and, where it helps, one action. Copy lives in the owning spec. |
| error | Inline message with retry; navigation chrome stays usable. Deleted or hidden objects render a neutral "no longer listed" page with nearby alternatives. |
| offline | Show cached content with a "showing saved results" banner, or disable the action with a reason. Queue RSVP and follow; fail create, comment, and post visibly. |
| signed-out | A gated action opens the sign-in sheet (S26) and completes the action after sign-in. Browse never gates. |
| cancelled | Occurrence-specific: solid banner at the top, dimmed in lists, RSVP disabled. |

## iOS screens

| Id | Screen | Mobile route | Web path | Entry | Phase | Spec | States beyond standard |
|---|---|---|---|---|---|---|---|
| S01 | Onboarding | `onboarding` (modal, first launch) | none | First launch | 1 | discovery | permission denied, geocode failure |
| S02 | Home (feed) | `(tabs)/index` | `/` | Tab | 1 | discovery | sections omitted when empty, widen radius |
| S03 | Map | `(tabs)/map` | `/map` | Tab | 1 (spots layer 4) | discovery | truncated results, search this area, layer toggle |
| S04 | List (map sheet expanded) | inside `(tabs)/map` | `/meets` | Map sheet toggle | 1 | discovery | sort by soonest or nearest |
| S05 | Search | `search` (modal) | `/meets?q=` | Search field on Home and Map | 1 | discovery | recents, no results, search everywhere |
| S06 | Create (tab) | `(tabs)/new` | `/new` (Later) | Tab | 2 (import 3) | create-and-host-tools, import-from-link | clipboard URL detected, offline |
| S07 | Me (tab) | `(tabs)/me` | `/u/:handle` (own) | Tab | 0 (skeleton), 2 | profiles-and-follow | signed-out (shows sign-in and settings only) |
| S08 | Event detail | `meets/[slug]` | `/meets/:slug` | Cards, pins, links | 1 | event-detail-and-rsvp | cancelled, unclaimed, unlisted, no longer listed |
| S09 | Occurrence detail (one date) | `occurrences/[id]` | `/meets/:slug/:occurrenceId` | Event detail dates, notifications | 2 | event-detail-and-rsvp | cancelled, past |
| S10 | Going list | `occurrences/[id]/going` | none | Occurrence and event detail | 2 | event-detail-and-rsvp | empty |
| S11 | Profile (also a user host page) | `u/[handle]` | `/u/:handle` | Host chips, comments, members | 1 (read-only), 2 | profiles-and-follow | blocked, private (Later), self |
| S12 | Club page | `clubs/[slug]` | `/clubs/:slug` | Host chips, feed, search, profile clubs | 1 | clubs | hidden (404), member view, manager view (7) |
| S13 | Club members | `clubs/[slug]/members` | `/clubs/:slug` (section) | Club page | 1 | clubs | empty |
| S14 | Sponsor page | `sponsors/[slug]` | `/sponsors/:slug` | Host chips, sponsor block, feed | 1 | sponsors | hidden (404) |
| S15 | Spot page | `spots/[slug]` | `/spots/:slug` | Spots layer, photo tags, feed | 4 | spots | no photos yet, access warning |
| S16 | Post detail | `posts/[id]` | `/posts/:id` | Photo grids, feed, notifications | 4 | photos-and-posts | instagram unavailable, hidden |
| S17 | Post composer | `posts/new` (modal) | none | Event detail, Me, share extension | 4 | photos-and-posts | upload progress, safety rejection, instagram private |
| S18 | Spot picker | `spots/pick` (modal) | none | Post composer | 4 | spots | nearby suggestions, create new, duplicate warning |
| S19 | Share intake | `share` (share extension target) | none | iOS share sheet | 3 (links), 4 (Instagram) | import-from-link, photos-and-posts | unsupported URL, signed-out |
| S20 | Manual create form | `meets/new` | `/new` (Later) | Create tab | 2 | create-and-host-tools | validation, draft saved, offline |
| S21 | Edit event | `meets/[slug]/edit` | none | Event detail host controls | 2 | create-and-host-tools | validation, re-materialization pending |
| S22 | Occurrence override sheet | sheet in `meets/[slug]` | none | Host controls | 2 | create-and-host-tools | none |
| S23 | Claim sheet | `meets/[slug]/claim` (sheet) | none | Event detail "Are you the host?" | 2 | create-and-host-tools | pending, rejected, already claimed |
| S24 | Import draft editor | `imports/[id]` | `/imports/:id` (Later) | Create tab, share intake | 3 | import-from-link | fetching stages, paste text fallback, duplicate found, failed |
| S25 | Recurrence and exceptions editor | `meets/[slug]/schedule` | none | Create and edit forms | 2 | create-and-host-tools | none |
| S26 | Sign-in sheet | `sign-in` (modal) | `/sign-in` (Later) | Any gated action | 0 | auth-and-accounts | provider error, cancelled |
| S27 | Settings | `settings` | none | Me | 0 (theme picker), 2 | auth-and-accounts | permission denied deep link |
| S28 | Edit profile | `settings/profile` | none | Me, Settings | 2 | profiles-and-follow | handle taken, invalid social handle |
| S29 | Garage | `me/garage`, `me/garage/[id]` | `/u/:handle` (section) | Me, Profile | 2 | profiles-and-follow | empty |
| S30 | Notifications inbox | `notifications` | none | Bell on Home, Me | 4 | notifications | empty, permission denied |
| S31 | Following | `me/following` | none | Me | 2 | profiles-and-follow | empty, filter by type |
| S32 | Comments | `meets/[slug]/comments`, `posts/[id]/comments` | `/meets/:slug` (section) | Event detail, post detail | 4 | photos-and-posts | empty, composer disabled offline |
| S33 | Report sheet | sheet | none | Long-press and overflow menus | 2 | moderation-and-safety | submitted, rate limited |
| S34 | Story card preview | sheet | none | Share button | 2 | event-detail-and-rsvp | rendering |
| S35 | Delete account | `settings/delete-account` | none | Settings | 0 | auth-and-accounts | confirmation, in progress |
| S36 | Club manage | `clubs/[slug]/manage` | `/clubs/:slug/manage` | Club page (managers) | 7 | clubs | not enabled |
| S37 | Club invite redemption | `clubs/join/[code]` (deep link) | `/clubs/join/:code` | Invite link | 7 | clubs | invalid code, already a member |
| S38 | Theme picker | inside `settings` | none | Settings | 0 | design-system-and-theming | none |
| S39 | Event photos (full grid) | `meets/[slug]/photos` | `/meets/:slug` (section) | Event detail "See all" | 4 | photos-and-posts | empty, instagram unavailable |
| S40 | Component gallery (dev builds only, excluded from release) | `dev/gallery` | none | Dev menu | 0 | design-system-and-theming | none |
| S41 | Sponsor manage | `sponsors/[slug]/manage` | `/sponsors/:slug/manage` | Sponsor page (managers) | 7 | sponsors | not enabled |

## Web pages

Public web is read-only at launch (gaps item 10, confirmed 2026-09-06): browse, share, and directions, with RSVP and create opening the app or a store link. Web sign-in, RSVP, create, and club management are Phase 7.

| Id | Page | Path | Indexable | Phase | Spec |
|---|---|---|---|---|---|
| W01 | Home | `/` | yes | 1 | web |
| W02 | Meets list and search | `/meets` | yes, canonical | 1 | web |
| W03 | Event page | `/meets/:slug` | yes, primary SEO target, JSON-LD Event | 1 | web |
| W04 | Occurrence page | `/meets/:slug/:occurrenceId` | canonical to event unless overridden | 1 | web |
| W05 | Map | `/map` | noindex | 1 | web |
| W06 | Profile | `/u/:handle` | yes | 1 | web |
| W07 | Club directory | `/clubs` | yes | 1 | web |
| W08 | Club page | `/clubs/:slug` | yes | 1 | web |
| W09 | Sponsor page | `/sponsors/:slug` | yes | 1 | web |
| W10 | Spot directory | `/spots` | yes | 4 | web |
| W11 | Spot page | `/spots/:slug` | yes | 4 | web |
| W12 | City page | `/socal/:city` | yes | 1 | web |
| W13 | Post page | `/posts/:id` | noindex | 4 | web |
| W14 | OG card | `/og/meets/:slug.png` (`?format=story` for the 9:16 story card), `/og/spots/:slug.png` | resource | 1 (story 2, spots 4) | web |
| W15 | Sitemap, robots, AASA | `/sitemap.xml`, `/robots.txt`, `/.well-known/apple-app-site-association` (components cover `/meets/*`, `/occurrences/*`, `/u/*`, `/clubs/*`, `/sponsors/*`, `/spots/*`, `/posts/*`) | resource | 1 | web |
| W16 | Legal and utility | `/terms`, `/privacy`, `/guidelines`, `/bot`, `/unsubscribe/:token` | yes (unsubscribe noindex) | 2 (unsubscribe 4) | web |
| W17 | Sign in, create, import, club manage | `/sign-in`, `/new`, `/imports/:id`, `/clubs/:slug/manage` | noindex | 7 | web |

## Admin screens

Server-rendered Rails views on the API host, cookie sessions, `admin` and `moderator` roles only. Not part of the v1 JSON API.

| Id | Screen | Path | Phase | Spec |
|---|---|---|---|---|
| A01 | Admin sign-in (Google Identity Services, same verifier as the API) | `/admin/sign_in` | 0 | admin |
| A02 | Dashboard (counts, job health, open reports and claims) | `/admin` | 1 | admin |
| A03 | Venues CRUD | `/admin/venues` | 1 | admin |
| A04 | Events CRUD with occurrences and sponsorships | `/admin/events`, `/admin/events/:id/occurrences` | 1 | admin |
| A05 | Clubs CRUD with memberships | `/admin/clubs`, `/admin/clubs/:id/memberships` | 1 | admin |
| A06 | Sponsors CRUD | `/admin/sponsors` | 1 | admin |
| A07 | CSV seed import (events, venues, clubs, sponsors) | `/admin/seeds` | 1 | admin |
| A08 | Users (role, suspend, delete) | `/admin/users` | 1 | admin |
| A09 | Claim review | `/admin/claims` | 2 | admin |
| A10 | Moderation queue and actions | `/admin/reports` | 2 | admin, moderation-and-safety |
| A11 | Spots CRUD and merge | `/admin/spots` | 4 | admin, spots |
| A12 | Jobs (Mission Control) | `/admin/jobs` | 0 | admin |

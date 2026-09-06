# Spec: Sponsors

Status: draft. Phase: 1 (entity, sponsor as host, sponsorships, pages, feed section, search), 2 (follow), 7 (self-service). Last updated: 2026-09-06.
Depends on: events-and-occurrences.md (polymorphic host), event-detail-and-rsvp.md (sponsors block layout on S08), profiles-and-follow.md (follow), admin.md (A04, A06, A07), web.md (W09). Related decisions: ADR 0010, gaps items 9, 29; business plan section 12 (monetization deferred).

## Summary

A sponsor is a business that hosts or backs a meet: a brand, a vendor (a detailer with a tent, a coffee cart), or a venue (the coffee shop whose lot it is). One entity, `Sponsor`, with a `kind` that only changes the label. Sponsors can host events like a user or a club, and can be attached to anyone's event as a component with a role, so a meet can say "Coffee by Lido Coffee" without Lido running it. At launch sponsors are seeded and edited by the admin, their pages are read-only, and every sponsor surface is organic and unpaid. The brand is a tone, not a velvet rope: a sponsor never gates, ranks, or hides a meet, and every card looks the same whether or not a sponsor is on it (gaps item 29).

## User stories

| Id | Story |
|---|---|
| US-1 | As a browser, I want to see who is pouring the coffee or presenting a meet, and tap through to their page, so that I know what to expect at the lot. |
| US-2 | As a browser, I want a sponsor's page to list every meet it hosts or backs so that one page answers "where is this shop this weekend". |
| US-3 | As a browser, I want to see businesses near me that are part of upcoming meets so that I discover the local shops behind the scene. |
| US-4 | As a member, I want to follow a sponsor so that its meets reach my feed and notifications. |
| US-5 | As an admin, I want to seed and edit sponsors and attach them to events with a role so that the schedule carries real names before anyone self-serves. |
| US-6 | As a sponsor manager (post-launch), I want to edit my page and publish meets as my business so that the page stays current without the app owner. |

## Scope

In Phase 1: `sponsors` and `event_sponsorships` tables; sponsor as an event host (`host_type: Sponsor`) through the one `Host` shape; `sponsorships` on the Event detail and `sponsors_preview` on EventSummary (data rules here, block layout in event-detail-and-rsvp.md); S14 on mobile and W09 on web (rendering rules in web.md); `GET /sponsors`, `GET /sponsors/:slug`, `GET /sponsors/:slug/events`; the `sponsors_nearby` feed section; the Sponsors search group; admin CRUD (A06), sponsorships on the event form (A04), and CSV seed columns (A07).

In Phase 2: Follow on S14 (mechanics in profiles-and-follow.md).

In Phase 7 (post-launch): `sponsor_memberships`, `PATCH /sponsors/:id`, publishing events as a sponsor, editing sponsorships on one's own events, all behind a `sponsors_self_service` flag.

Not in this spec: paid placement of any kind (business plan section 12, deferred; see R-13); venue pages as a first-class surface (gaps item 9, deferred); clubs (clubs.md); the sponsors block layout and tap targets on S08 (event-detail-and-rsvp.md); moderation of sponsors (moderation-and-safety.md).

## Requirements

**Data**

- R-1 A sponsor MUST have a unique `slug`, a `name`, a `kind` in `brand`, `vendor`, `venue`, and a `status` in `active`, `hidden`, per `docs/data-model.md`; `tagline` MUST be at most 80 characters and `description` at most 1000. (US-1, US-5)
- R-2 An event MUST be able to name a sponsor as its host (`host_type: Sponsor`), and `events.host_name` MUST be rewritten when the sponsor is renamed. (US-2)
- R-3 An `event_sponsorships` row MUST have a `role` in `presented_by`, `coffee`, `vendor`, `partner`, MUST be unique per `(event_id, sponsor_id)`, MUST carry a `position`, and an event MUST have at most six sponsorships. (US-1, US-5)
- R-4 `sponsors.followers_count` MUST be a counter cache of `follows` with `followable_type: Sponsor`; `sponsors.events_count` MUST count published events the sponsor hosts plus published events it is attached to, maintained by callbacks on `events` and `event_sponsorships`. (US-2, US-4)
- R-5 A hidden sponsor MUST return 404 on every public endpoint, MUST be absent from feed, search, and `sponsors_preview`, and its sponsorships MUST be omitted from `sponsorships`; events it hosts remain visible with the sponsor as host. (US-1)

**API**

- R-6 `GET /sponsors`, `GET /sponsors/:slug`, and `GET /sponsors/:slug/events` MUST work without a token and MUST return the SponsorSummary and Sponsor shapes in `docs/api.md`, including `kind` and `viewer.following` (false for anonymous). (US-1, US-2)
- R-7 `GET /sponsors` with `near` MUST order by distance and include `distance_m`, MUST accept `kind` and `q`, and without `near` MUST order by `followers_count` descending. (US-3)
- R-8 `GET /sponsors/:slug/events` and `upcoming_events` on Sponsor MUST include events hosted by the sponsor and events it is attached to, each with `relation: "host" | "sponsor"`, upcoming first by next occurrence, deduplicated when both apply (`relation: "host"` wins). (US-2)
- R-9 The `Host` shape for a sponsor MUST set `type: "sponsor"` and `kind`, and `sponsors_preview` on EventSummary MUST hold at most two entries ordered by `position` with `role`. (US-1)
- R-10 `POST /events` and `PATCH /events/:id` MUST accept `sponsorships: [{ sponsor_id, role, note? }]` only from an admin at launch and MUST return 403 `forbidden` otherwise; `host: { type: "sponsor", id }` MUST return 403 `not_enabled` until Phase 7. (US-5, US-6)
- R-11 `PATCH /sponsors/:id` MUST exist and MUST return 403 with code `not_enabled` until `sponsors_self_service` is on; in Phase 7 it MUST require an `owner` or `admin` row in `sponsor_memberships` or a platform admin. (US-6)
- R-12 `GET /feed` MUST include a `sponsors_nearby` section only when at least one active sponsor within the browse radius hosts or is attached to a scheduled occurrence in the materialized horizon, MUST cap it at four SponsorSummary items ordered by nearest upcoming occurrence then distance, and MUST omit it otherwise. (US-3)
- R-13 No API response MUST carry a paid, promoted, or boosted flag for sponsors at launch; if paid placement ever ships, the item MUST carry `paid: true`, the client MUST label it "Sponsored", and the section order in `docs/api.md` MUST NOT change. (US-3)

**Mobile**

- R-14 Tapping a host chip of type `sponsor` or a sponsorship row anywhere in the app MUST open S14. (US-1)
- R-15 S14 MUST show banner, logo, name, verified badge, the kind label ("Sponsor", "Vendor", "Venue partner"), `home_label`, tagline, description, website, links as icon links, follower count, upcoming meets (up to three, each labeled "Hosts" or "Sponsors" from `relation`, with a "See all" link to a List filtered by `sponsor=<id>`), and a Follow button (Phase 2). (US-1, US-2, US-4)
- R-16 The feed MUST render `sponsors_nearby` as a titled row of SponsorSummary cards with no "Sponsored" label, identical in weight to "Clubs near you". (US-3)
- R-17 Search MUST return sponsors as the Sponsors group after Clubs, matched on `name` with trigram similarity. (US-1)
- R-18 The app MUST have no sponsor creation or editing surface at launch; a sponsor who asks is pointed at the support email in the S14 footer line. (US-5)

**Web**

- R-19 W09 MUST server-render the same content as S14 with JSON-LD `Organization` and the kind label; rendering rules and ACs are in web.md. (US-2)

**Admin and jobs**

- R-20 Admin MUST be able to create, edit, hide, and verify sponsors (A06), attach and reorder sponsorships with a role and note on any event (A04), and import sponsors and sponsorships from CSV (A07). (US-5)
- R-21 The nightly `HostConsistencyJob` MUST also report events whose `host_type: Sponsor` points at a missing or hidden sponsor. (US-2)

## Data

`sponsors`, `event_sponsorships` (both in the Phase 1 host migration), `events.host_type`, `events.host_id`, `events.host_name`, `follows` with `followable_type: Sponsor`, `reports` with `reportable_type: Sponsor`. Feature flag `sponsors_self_service` in `config/features.yml` beside `clubs_self_service`. Phase 7 migration: `sponsor_memberships` (`sponsor_id`, `user_id`, `role` in `owner`, `admin`; `status` in `active`, `invited`; unique `(sponsor_id, user_id)`), mirroring `club_memberships` without `member`.

## API

Read: `GET /sponsors` (`near`, `radius_km`, `kind`, `q`), `GET /sponsors/:slug`, `GET /sponsors/:slug/events` (`past=true`), `GET /events?sponsor=<id>`, `GET /feed` (`sponsors_nearby`).

Write (Phase 2): `PUT /follows` and `DELETE /follows` with `followable_type: Sponsor`.

Write (admin at launch): `sponsorships` on `POST /events` and `PATCH /events/:id`. Everything else is the admin UI.

Write (Phase 7, behind `sponsors_self_service`): `PATCH /sponsors/:id` (`name`, `tagline`, `description`, `website`, `links`, `home_location`, `home_label`, `logo_blob_id`, `banner_blob_id`), `POST /events` with `host: { type: "sponsor", id }`, and `sponsorships` on a host's own event.

## Screens and states

| Screen id | Screen | Route (mobile / web) | Primary actions | States |
|---|---|---|---|---|
| S14 | Sponsor page | `sponsors/[slug]` / `/sponsors/:slug` | Follow (2), Website, See all meets, open a meet, share | loading, error, offline, hidden (no longer listed), signed-out on Follow, no upcoming meets |
| S02 (section) | `sponsors_nearby` row on Home | `(tabs)/index` / `/` | Open a sponsor | present, absent (omitted) |
| S05 (group) | Sponsors group in Search | `search` / `/meets?q=` | Open a sponsor | results, none |
| S08 (block) | Sponsors block on Event detail | `meets/[slug]` / `/meets/:slug` | Open a sponsor | layout owned by event-detail-and-rsvp.md |
| A06 | Sponsors CRUD | `/admin/sponsors` | Create, edit, hide, verify | owned by admin.md |
| W09 | Sponsor page (web) | none / `/sponsors/:slug` | Website, Follow in the app | owned by web.md |

## Copy

| Where | String |
|---|---|
| Kind label, brand | Sponsor |
| Kind label, vendor | Vendor |
| Kind label, venue | Venue partner |
| S14 verified | Verified |
| S14 followers | 120 followers |
| S14 upcoming header | Upcoming |
| S14 relation labels | Hosts, Sponsors |
| S14 upcoming empty | No meets listed yet. Follow to hear when one is. |
| S14 website | Website |
| S14 see all | See all meets |
| S14 hidden | This sponsor is no longer listed. |
| S14 footer line | Run this business? Email hello@curbsocial.club to update the page. |
| S14 error | Couldn't load this page. Try again. |
| Feed section title | Sponsors near you |
| Feed card line | Coffee at Back Bay Coffee, Sat 7:30 am |
| Search group title | Sponsors |
| Sponsorship roles (S08) | Presented by, Coffee by, Vendor, Partner |
| Sponsorship note (example) | Free pour-over until 9. |
| Follow button | Follow, Following |
| Paid label (never at launch; required if paid placement ships) | Sponsored |
| Phase 7 not enabled (API message) | Sponsor tools are coming after launch. Email hello@curbsocial.club to update your page. |

## Acceptance criteria

| Id | Given | When | Then | Proves |
|---|---|---|---|---|
| AC-1 | A seeded active sponsor of kind `venue` hosting one event and attached to two others | `GET /sponsors/:slug` without a token | 200 with the Sponsor shape, `kind: "venue"`, `upcoming_events` with three entries, one `relation: "host"` and two `relation: "sponsor"`, `viewer.following` false | R-6, R-8 |
| AC-2 | A sponsor that both hosts and is attached to the same event | `GET /sponsors/:slug/events` | The event appears once with `relation: "host"` | R-8 |
| AC-3 | A sponsor with `status: hidden` that hosts one published event and is attached to another | `GET /sponsors/:slug`, `GET /sponsors`, `GET /events/:slug` for both events | 404; absent from the list; the hosted event returns 200 with `host.type: "sponsor"`; the other event's `sponsorships` and `sponsors_preview` omit the hidden sponsor | R-5, R-9 |
| AC-4 | Sponsors at 3, 12, and 70 km with `kind` brand, vendor, venue | `GET /sponsors?near=lat,lng&radius_km=40`, then `&kind=vendor` | Two sponsors ordered 3 km then 12 km with `distance_m`; then only the vendor | R-7 |
| AC-5 | An event with three sponsorships at positions 2, 1, 3 | `GET /events` for its area and `GET /events/:slug` | `sponsors_preview` holds the two lowest positions in order with `role`; `sponsorships` holds all three in position order | R-3, R-9 |
| AC-6 | An event with six sponsorships | A seventh `event_sponsorships` row is saved, or a duplicate sponsor is added | Validation error in both cases | R-3 |
| AC-7 | A sponsor renamed in the admin UI | The rename is saved | Every event hosted by the sponsor has the new `host_name` | R-2 |
| AC-8 | A sponsor with one hosted published event and one attached published event | A third event is published with the sponsor attached, then the hosted one is cancelled | `events_count` goes 2, 3, 2 | R-4 |
| AC-9 | A member (not admin) | `POST /events` with `sponsorships` and, separately, with `host: { type: "sponsor", id }` | 403 `forbidden`, then 403 `not_enabled`; the same body from an admin creates the event with the sponsorship | R-10 |
| AC-10 | `sponsors_self_service` off | `PATCH /sponsors/:id` with a valid token | 403 with `error.code` `not_enabled` | R-11 |
| AC-11 | Two active sponsors within 32 km, one attached to a Saturday occurrence and one with no upcoming meet, plus a third with a meet at 70 km | `GET /feed?near=lat,lng` | `sponsors_nearby` holds exactly the first sponsor; cancelling that occurrence removes the section | R-12 |
| AC-12 | Six sponsors within radius each with an upcoming meet | `GET /feed` | `sponsors_nearby` holds four, ordered by soonest occurrence then distance, no `paid` key | R-12, R-13 |
| AC-13 | A meet card whose host is a sponsor of kind `vendor`, on device | The host chip is tapped | S14 opens with the name and "Vendor" label within one navigation | R-14, R-15 |
| AC-14 | S14 on device for a sponsor with three upcoming meets | The page is scrolled and "See all meets" is tapped | Each meet row shows "Hosts" or "Sponsors"; the List opens filtered to that sponsor | R-15 |
| AC-15 | S14 on device, signed out | Follow is tapped | The sign-in sheet opens; after sign-in the button reads Following and `followers_count` increments | R-15, signed-out state |
| AC-16 | The feed on device with a `sponsors_nearby` section | The section is inspected | The row title is "Sponsors near you", cards carry no "Sponsored" label, and the row matches the clubs row in size | R-16 |
| AC-17 | S05 on device with "lido" typed | Results render | A Sponsors group appears after Clubs with Lido Coffee | R-17 |
| AC-18 | The app on device | Every screen is searched for a create or edit sponsor action | None exists; S14 shows the footer line with the support email | R-18 |
| AC-19 | An event whose `host_id` points at a hidden sponsor | `HostConsistencyJob` runs | The event is in the job's report | R-21 |
| AC-20 | Phase 7: an `admin` membership on sponsor X and none on Y | `PATCH /sponsors/X` then `PATCH /sponsors/Y` with the flag on | 200 then 403 | R-11 |

## Verification

| Check | How |
|---|---|
| API | `pnpm --filter @curb/api test spec/requests/api/v1/sponsors_spec.rb spec/models/sponsor_spec.rb spec/models/event_sponsorship_spec.rb spec/jobs/host_consistency_job_spec.rb` |
| Feed and events | `spec/requests/api/v1/feed_spec.rb` covers AC-11 and AC-12; `spec/requests/api/v1/events_spec.rb` covers AC-5 and AC-9 |
| Mobile | Manual on a physical iPhone in Marine Layer light: open a sponsor from a meet card and from the S08 sponsors block, scroll S14, tap See all, tap Follow signed out, check the feed row and the search group. Maestro flow `sponsor_page.yaml` once flows exist |
| Web | web.md AC-5 covers W09 |
| Admin | admin.md ACs for A06, A04 sponsorship rows, A07 CSV columns |
| Design | Figma page "iOS Screens", frame "Sponsor" (Phase 1 design pass); the sponsor card must match the club card frame by frame |

## Risks and open questions

- Adopted 2026-09-06 into docs/api.md: add `sponsor=<id>` as a documented filter on `GET /events` (it is listed in the params but not in the Sponsors section), add `PATCH /sponsors/:id` as a stubbed endpoint returning `not_enabled`, and document 403 `forbidden` for non-admin `sponsorships`. Default: as written in R-10 and R-11.
- Adopted 2026-09-06 into docs/data-model.md: cap `event_sponsorships` at six per event (R-3) and add `sponsor_memberships` when Phase 7 is scheduled. Default: six, enforced in the model.
- Adopted 2026-09-06 into docs/screens.md: S41 Sponsor manage (Phase 7) reuses the S36 layout; nothing is built until Phase 7 is planned.
- Gaps item 9: a sponsor of kind `venue` is not linked to a `venues` row. Default: no link at launch; if venue partners want their lot's meets grouped, add a nullable `sponsors.venue_id` and derive the relation.
- Gaps item 29: sponsor surfaces must read as local color, not advertising. Default: identical card weight to clubs, no sponsor-only sections, no sponsor filter on the map, and a two-way copy test on the feed row title before beta.
- Business plan section 12: monetization is deferred and discovery is never paywalled. Default: no `paid` column, no pricing, no ranking effect; R-13 is the guardrail if that changes.
- Seeded sponsors have no consenting manager. Default: the admin seeds only businesses that are publicly associated with a meet (named on the organizer's post or flyer) and hides any that ask.

## Session breakdown

| Slice | Deliverable | Covers | Must pass |
|---|---|---|---|
| 1 (Phase 1, with the host migration) | `sponsors` and `event_sponsorships` tables, models, validations, counter caches, rename callback, `HostConsistencyJob` sponsor branch, factories | R-1 to R-5, R-21 | AC-3 (model part), AC-6 to AC-8, AC-19 |
| 2 (Phase 1) | Read endpoints and serializers with `relation`, `sponsors_preview` and `sponsorships` on events, admin-only `sponsorships` on write, stubbed `PATCH /sponsors/:id`, feed section, search group, rswag specs | R-6 to R-13, R-17 | AC-1 to AC-5, AC-10 to AC-12 (AC-9 moves to the Phase 2 row because it needs `POST /events`) |
| 3 (Phase 1) | Admin CRUD for sponsors, sponsorship rows on the event form, CSV seed columns (admin.md A04, A06, A07) | R-20 | Admin spec ACs |
| 4 (Phase 1) | S14 on mobile, host chip and sponsorship row navigation, feed row card, search group rendering | R-14 to R-16, R-18 | AC-13, AC-14, AC-16 to AC-18 |
| 5 (Phase 1) | W09 with JSON-LD (built in web.md slice 5) | R-19 | web.md AC-5 |
| 6 (Phase 2) | Follow button wiring on S14 | R-15 (Follow) | AC-15 |
| 7 (Phase 7) | `sponsor_memberships` migration, `PATCH /sponsors/:id` behind the flag, `host.type: sponsor` on `POST /events`, manage screen | R-10 (Phase 7), R-11 | AC-20 |

# Spec: Discovery

Status: draft. Phase: 1 (onboarding, feed, map, list, search), 4 (spots layer, `recent_photos` and `spots_nearby` feed sections). Last updated: 2026-09-06.
Depends on: events-and-occurrences.md (occurrences, materializer), clubs.md and sponsors.md (feed sections), spots.md (layer and section, Phase 4), design-system-and-theming.md (glass rules, pins). Related decisions: ADR 0003, ADR 0010, gaps items 8, 21, 26, 29, 30.

## Summary

Discovery is the read-only heart of curb: a stranger opens the app, tells it roughly where they are, and sees this weekend's meets on a feed, a map, and a list within two seconds, with no account. Onboarding asks for an area, not an identity. The feed is sectioned by time and by entity, the map is a bounding-box query clustered on the client, and search finds meets, clubs, sponsors, and places. Every surface renders flat content under system glass and sends only coarse coordinates.

## User stories

| Id | Story |
|---|---|
| US-1 | As a browser, I want to open the app for the first time and pick my area in under 15 seconds so that I see meets near me without creating an account. |
| US-2 | As a browser, I want a feed that answers "what is on this weekend near me" so that I can decide where to go on Saturday morning. |
| US-3 | As a browser, I want to pan a map and see meets in view, clustered when dense, so that I can browse by place instead of by list. |
| US-4 | As a browser, I want to filter the map and list to this weekend, a distance, a theme, or recurring meets so that the results match how I search. |
| US-5 | As a browser, I want to search for a meet, a club, a sponsor, or a city so that I can jump straight to the thing I already know about. |
| US-6 | As a browser with location off, or offline, I want the app to keep working with a typed city or the last saved results so that a permission or a dead spot never blanks the screen. |
| US-7 | As a photographer (Phase 4), I want a Spots layer on the map so that I can find places to shoot near a meet. |

## Scope

In Phase 1: S01 onboarding with the area picker and approximate location; S02 feed consuming `GET /feed` with the `this_weekend`, `following`, `clubs_nearby`, `sponsors_nearby`, `next_week`, and `later` sections; S03 map on react-native-maps with `GET /events/map`, supercluster, four filter chips, the draggable sheet, and "search this area"; S04 list as the expanded sheet with two sorts; S05 search grouped by Events, Clubs, Sponsors, Places; persisted cache for offline; the rounding rule for browse coordinates.

In Phase 4: the `recent_photos` and `spots_nearby` feed sections (item shapes in photos-and-posts.md and spots.md); the Spots layer toggle on S03 backed by `GET /spots/map`; a Spots group in search.

Not in this spec: event cards' tap target and the detail screen (event-detail-and-rsvp.md); the `following` section's follow mechanics (profiles-and-follow.md); the feed and map on web (web.md, W01, W02, W05); push and the bell on Home (notifications.md); personalized ranking and the activity strip (Later, no spec); vehicle interests as a ranking signal (Later).

## Requirements

**Data**

- R-1 Every browse request MUST send coordinates rounded to two decimal places (about 1 km) and MUST NOT send precise location for feed, map, list, or search. (US-1, US-6)
- R-2 The chosen home area MUST be persisted locally and, when the device row exists, sent as `home_location` on `POST /devices` or `PATCH /devices/:anonymous_id`, rounded per R-1. (US-1)
- R-3 The browse radius MUST default to 32 km, MUST widen to 80 km on the widen action, and MUST never exceed the API maximum of 160 km. (US-2)
- R-4 Vehicle interests chosen on S01 card three MUST be stored on the device only in Phase 1 and MUST NOT change any query. (US-1)

**API**

- R-5 `GET /feed` MUST accept `near` and `radius_km`, MUST work without a token, and MUST return sections in the order `this_weekend`, `following`, `recent_photos`, `clubs_nearby`, `sponsors_nearby`, `spots_nearby`, `next_week`, `later`, omitting any section with zero items and omitting `following` for anonymous callers. (US-2)
- R-6 `this_weekend` MUST contain scheduled occurrences from now through the end of the coming Sunday in the venue's timezone; `next_week` MUST contain the following Monday through Sunday; `later` MUST contain the rest of the materialized horizon (90 days); each event appears once, by its next occurrence, ordered by `starts_at` then `distance_m`. (US-2)
- R-7 `GET /events/map` MUST require `bbox`, MUST accept `from`, `to`, `tags[]`, and `recurring`, MUST return at most 500 MapPin rows, and MUST set `meta.truncated: true` when the box held more. (US-3)
- R-8 `GET /events` with `bbox`, the same filters as R-7, and `sort=date|distance` MUST return the EventSummary rows the map sheet lists, paginated, and MUST include `distance_m` when `near` is also present. (US-3, US-4)
- R-9 `GET /events?q=`, `GET /clubs?q=`, `GET /sponsors?q=`, and (Phase 4) `GET /spots?q=` MUST match on trigram similarity of title or name and `events.host_name`, MUST accept `near` and `radius_km`, and MUST return within 80 km by default when `near` is present; with `q` and no `near`, `GET /events` MUST search all published events ordered by next occurrence. (US-5)

**Mobile**

- R-10 S01 MUST show three cards (what curb is, pick your area, optional interests), each with Skip, MUST request location only from card two after an in-app explainer, and MUST request reduced accuracy (`Location.Accuracy.Lowest` with the iOS reduced-accuracy purpose key). (US-1)
- R-11 When location is denied or skipped, S01 MUST offer a city search (MapKit geocoding) and a drop-a-pin map, and MUST let the user continue with the default region (coastal Orange County, 33.62, -117.93) when offline or when geocoding fails. (US-6)
- R-12 S02 MUST render each feed section as a titled group in API order, MUST hide a section when it is absent, and MUST show the widen-radius empty state only when the response holds no sections at all. (US-2)
- R-13 The event card MUST show cover (or the flat placeholder), title in the serif, day and time in the venue timezone, venue name and `distance_m` in miles, the host chip built from the one `Host` shape, a recurring badge with `rrule_text`, `going_count` when above zero, a source pill when `source` is present, up to two `sponsors_preview` logos, and a confirmation chip from `stale` and `claimed` using the exact strings in events-and-occurrences.md: "Check. Last confirmed <date>." when `stale` is true, "Unclaimed. Last confirmed <date>." when `claimed` is false and `stale` is false, nothing when claimed. (US-2)
- R-14 S02 MUST support pull to refresh, MUST persist the last successful feed and list responses to MMKV through the TanStack Query persister, and MUST show the saved-results banner when rendering from cache while offline. (US-6)
- R-15 S03 MUST fetch `GET /events/map` for the visible bbox 300 ms after the region settles on first load and on tap of the "search this area" pill, MUST show the pill after the map moves more than 20 percent of the viewport or one zoom level from the last fetched box, and MUST cluster pins client-side with supercluster (radius 56 px, max zoom 16). (US-3)
- R-16 Tapping a cluster MUST zoom to its expansion zoom; tapping a pin MUST select it (1.2x, ring `textPrimary`) and scroll its card into view in the sheet; tapping a card MUST recenter the map on its pin and select it. (US-3)
- R-17 S03 MUST float four filter chips (This weekend, Distance, Theme, Recurring only) in one `GlassContainer` and a locate-me control in another, capability-gated with a blur or solid fallback, and MUST apply the same filters to the pins and the sheet list. (US-4)
- R-18 The sheet MUST have three detents (peek with a count, half list, full list); the full detent is S04 with a Soonest or Nearest sort backed by `sort=date|distance`. (US-3, US-4)
- R-19 When `meta.truncated` is true S03 MUST render the pins it received and show the zoom-in notice in the sheet. (US-3)
- R-20 S05 MUST open from the glass search field on Home and Map, MUST debounce input 250 ms with a two-character minimum, MUST show up to ten recents when empty, MUST group results as Events, Clubs, Sponsors, Places (Spots after Places in Phase 4), and MUST move the map to a picked place and close. (US-5)
- R-21 S05 no-results MUST offer "Search everywhere" (repeats the query without `near`) and "Add a meet" (opens S06). (US-5)
- R-22 In Phase 4, S03 MUST show a Spots layer toggle beside the filter chips that fetches `GET /spots/map` for the same bbox and renders SpotPin rows in the spot pin style, clustered separately from event pins, with the same 500 cap handling. (US-7)

**Web**

- R-23 None here; W01, W02, and W05 are specified in web.md and reuse the `supercluster` wrapper from `packages/ui/map`.

**Admin and jobs**

- R-24 `GET /feed` responses MUST be served through Solid Cache keyed by rounded `near`, `radius_km`, and viewer presence, for 60 seconds. (US-2)

## Data

Reads: `event_occurrences` (`starts_at`, `location`, `status`, `going_count`), `events` (`title`, `slug`, `host_type`, `host_id`, `host_name`, `rrule`, `tags`, `source_url`, `source_type`, `claimed_at`, `last_confirmed_at`, `visibility`), `venues` (`name`, `city`, `location`, `timezone`), `clubs` and `sponsors` (`home_location`, `status`), `spots` (`location`, `status`, Phase 4). Writes: `devices.home_location` through the devices endpoints. No migration. Search indexes are the trigram GINs already listed in `docs/data-model.md`.

## API

`GET /feed`, `GET /events` (`near`, `radius_km`, `bbox`, `from`, `to`, `tags[]`, `recurring`, `q`, `sort`), `GET /events/map`, `GET /clubs` (`q`, `near`), `GET /sponsors` (`q`, `near`), `POST /devices`, `PATCH /devices/:anonymous_id`. Phase 4: `GET /spots/map`, `GET /spots` (`q`). Place search does not touch the API; it uses MapKit geocoding on device.

Deltas adopted into docs/api.md on 2026-09-06 (see Risks): the section time boundaries in R-6; `recurring` on `GET /events/map`; `q` without `near` on `GET /events`.

## Screens and states

| Screen id | Screen | Route (mobile / web) | Primary actions | States |
|---|---|---|---|---|
| S01 | Onboarding | `onboarding` (modal, first launch) / none | Allow location, Pick a city, Drop a pin, Skip | loading (city search), permission denied, geocode failure, offline (default region) |
| S02 | Home (feed) | `(tabs)/index` / `/` | Open a card, host chip, section "See all", widen radius, refresh | loading (five skeleton cards), empty (no sections), error, offline (saved results) |
| S03 | Map | `(tabs)/map` / `/map` | Pan, tap pin or cluster, chips, search this area, locate me, Spots toggle (4) | loading (dimmed pins, sheet progress), empty (sheet message), error (retry in sheet), offline (last pins, pill disabled), truncated |
| S04 | List (sheet expanded) | inside `(tabs)/map` / `/meets` | Sort Soonest or Nearest, open a card | loading, empty, error, offline |
| S05 | Search | `search` (modal) / `/meets?q=` | Type, pick a recent, pick a result, Search everywhere, Add a meet | empty (recents), loading, no results, error, offline (cached only) |

## Copy

| Where | String |
|---|---|
| S01 card one | Every car meet within 20 miles. Saturday and Sunday mornings, mostly. |
| S01 card two | Pick your area. We only use it to sort the map. |
| S01 card two, explainer before the system prompt | curb asks for your approximate location, about a kilometer, to sort meets by distance. It never tracks you. |
| S01 card two, actions | Use my location, Pick a city, Drop a pin, Skip |
| S01 card three | Anything you drive or like? Optional. It does not change what you see yet. |
| S01 iOS purpose string (`NSLocationWhenInUseUsageDescription`) | curb uses your approximate location to show meets near you. |
| S01 denied | Location is off. Pick a city or drop a pin and we sort from there. |
| S01 geocode failure | We couldn't find that city. Drop a pin instead. |
| S01 offline | You're offline. We'll start you in coastal Orange County and ask again later. |
| S02 section titles | This weekend, From people you follow, Recent photos, Clubs near you, Sponsors near you, Spots near you, Next week, Later |
| S02 empty, headline | Nothing listed within 20 miles yet. |
| S02 empty, actions | Widen to 50 miles, Add a meet |
| S02 empty after widening | Nothing listed within 50 miles yet. Add the one you know about. |
| S02 offline banner | Showing saved results. |
| S02 error | Couldn't load the feed. Try again. |
| Card chip, stale | Check. Last confirmed Jul 12. |
| Card chip, unclaimed and fresh | Unclaimed. Last confirmed Aug 30. |
| Card, source pill | Instagram, Evite, Eventbrite, Meetup, Host |
| Card, going | 42 going |
| S03 chips | This weekend, Distance, Theme, Recurring only |
| S03 Distance options | 10 miles, 20 miles, 50 miles |
| S03 Theme options | All, JDM, Euro, Exotic, Classic, Muscle, Trucks, EV, Bikes |
| S03 search this area | Search this area |
| S03 sheet peek | 12 meets in view |
| S03 empty | Nothing here this weekend. |
| S03 empty toggle | Show all upcoming |
| S03 truncated | Zoom in to see all meets here. |
| S03 error | Couldn't load this area. Try again. |
| S03 offline | You're offline. Showing the last results. |
| S03 Spots toggle (4) | Spots |
| S04 sort | Soonest, Nearest |
| S05 placeholder | Search meets, clubs, places |
| S05 groups | Events, Clubs, Sponsors, Places, Spots (4) |
| S05 recents header | Recent |
| S05 no results | Nothing for "{query}" within 50 miles. Try a city, a host, or a day. |
| S05 no results, actions | Search everywhere, Add a meet |
| S05 offline | Searching saved results only. |

## Acceptance criteria

| Id | Given | When | Then | Proves |
|---|---|---|---|---|
| AC-1 | Occurrences at 3 km on Saturday, 5 km next Wednesday, and 5 km in five weeks, plus an active club at 10 km | `GET /feed?near=lat,lng` without a token | Sections in order `this_weekend`, `clubs_nearby`, `next_week`, `later`, each with one item; no `following`, `recent_photos`, `sponsors_nearby`, or `spots_nearby` key | R-5, R-6 |
| AC-2 | The same data plus a sponsor with a sponsored occurrence at 8 km, and a signed-in viewer following one host | `GET /feed` with the token | `following` appears second and `sponsors_nearby` appears after `clubs_nearby`; removing the sponsorship removes `sponsors_nearby` | R-5 |
| AC-3 | Phase 4: a visible photo post at 6 km from three days ago and a visible spot at 4 km | `GET /feed` | `recent_photos` and `spots_nearby` are present in their positions; hiding the post and spot removes both sections | R-5 |
| AC-4 | Occurrences at 20 km and 60 km | `GET /feed` with `radius_km=32`, then `radius_km=80`, then `radius_km=200` | First returns one item, second two, third responds 400 | R-3, R-5 |
| AC-5 | 600 scheduled occurrences inside a bbox | `GET /events/map?bbox=w,s,e,n` | 500 MapPin rows and `meta.truncated: true`; with `recurring=true` only recurring events' pins return | R-7 |
| AC-6 | Ten events in a bbox with a `near` inside it | `GET /events?bbox=...&near=...&sort=distance` then `sort=date` | Rows ordered by `distance_m` ascending, then by `next_occurrence.starts_at` ascending | R-8 |
| AC-7 | An event titled "Back Bay Coffee" hosted by "Back Bay Air-Cooled", a club "Back Bay Air-Cooled", a sponsor "Lido Coffee" | `GET /events?q=back bay`, `GET /clubs?q=back bay`, `GET /sponsors?q=lido` each with `near` 100 km away, then `GET /events?q=back bay` without `near` | The first three return nothing (outside 80 km); the last returns the event | R-9 |
| AC-8 | Fresh install, airplane mode on, on device | S01 is completed with Skip on every card | S02 loads the default region and shows the offline copy; turning networking on and pulling to refresh loads the feed | R-11, R-14 |
| AC-9 | Fresh install, on device | Location is allowed on card two | The system prompt appears only after the explainer; the request sent to `/feed` carries `near` with two-decimal coordinates (verify in the Rails log) | R-1, R-10 |
| AC-10 | Location denied, on device | "Pick a city" is used with "Laguna Beach" | S02 loads with Laguna Beach meets and `devices.home_location` is set to a two-decimal point | R-2, R-11 |
| AC-11 | A feed with three sections, on device | The sections are inspected | Only the three titles render, in API order, with no empty group | R-12 |
| AC-12 | A feed response with zero sections | S02 renders | The empty headline and both actions show; tapping Widen refetches with `radius_km=80`, and the after-widening copy shows if still empty | R-3, R-12 |
| AC-13 | A card for an unclaimed, recurring, imported event with two sponsors, `stale: true`, and `last_confirmed_at` 45 days ago | The card renders (RNTL test) | Title, "Every Saturday", "Check. Last confirmed <date>.", the source pill, two logos, and the host chip are present; going count is hidden at zero; with `stale: false` the chip reads "Unclaimed. Last confirmed <date>." | R-13 |
| AC-14 | Two pins 30 px apart at zoom 12 and 400 px apart at zoom 15 | The supercluster wrapper is run (Vitest) | One cluster of 2 at zoom 12; two pins at zoom 15; a cluster tap returns an expansion zoom greater than 12 | R-15, R-16 |
| AC-15 | S03 on device with 40 pins in view | The map is panned by half a viewport and the pill is tapped | The pill appears after the pan, one `GET /events/map` fires on tap, and the sheet count updates | R-15 |
| AC-16 | S03 on device | A pin is tapped, then a different card is tapped | The card scrolls into view and highlights; the map recenters on the second pin and it scales | R-16 |
| AC-17 | S03 on device with the This weekend chip on | Theme is set to JDM and Recurring only is on | Pins and the sheet list both update from one request pair carrying `tags[]=jdm&recurring=true` | R-17 |
| AC-18 | The API stubbed to return `truncated: true` | S03 renders | The received pins render and the zoom-in notice shows in the sheet | R-19 |
| AC-19 | Phase 4: S03 on device with spots in view | The Spots toggle is turned on, then off | Spot pins appear in the spot style beside event pins, `GET /spots/map` fires once per box, and the pins disappear on off | R-22 |
| AC-20 | S05 on device with two recents | Nothing is typed, then "corona" is typed | Recents list first; one request per group fires after 250 ms; results group as Events, Clubs, Sponsors, Places | R-20 |
| AC-21 | S05 with a query that matches nothing | The no-results state shows and Search everywhere is tapped | The events request repeats without `near`, and Add a meet opens S06 | R-21 |
| AC-22 | S05 on device | The place "Dana Point" is picked | S05 closes and S03 is centered on Dana Point with a fresh fetch | R-20 |

## Verification

| Check | How |
|---|---|
| API | `pnpm --filter @curb/api test spec/requests/api/v1/feed_spec.rb spec/requests/api/v1/events_spec.rb spec/requests/api/v1/events_map_spec.rb spec/requests/api/v1/search_spec.rb` |
| Cluster logic | `pnpm --filter @curb/ui test packages/ui/map` covers AC-14 |
| Cards | `pnpm --filter @curb/mobile test src/components/EventCard.test.tsx` covers AC-13 |
| Mobile | Maestro `onboarding.yaml`, `browse_feed.yaml`, `map_open_meet.yaml`, `search.yaml`. Manual on a physical iPhone in Marine Layer light and dark: AC-8 to AC-12, AC-15 to AC-18, AC-20 to AC-22; check chips over satellite tiles with Reduce Transparency on |
| Design | Figma page "iOS Screens", frames "Onboarding", "Home", "Map", "Search"; pin styles per brand guide section 4 |

## Risks and open questions

- Adopted 2026-09-06 into docs/api.md: define the `this_weekend`, `next_week`, and `later` windows as in R-6, add `recurring=true` to `GET /events/map`, and state that `GET /events?q=` without `near` searches everywhere. Default: as written in R-6 to R-9.
- Interests stay on device (R-4); no data model change. If ranking ships, add `devices.interests text[]`.
- Gaps item 21: react-native-maps on Apple Maps with client clustering. Default: as written; server clustering only if AC-5's cap trips in production weekly.
- Gaps item 30: pin states. Default: `now`, `today`, `upcoming`, `recurring` from the brand guide; `past` pins are not drawn on S03 at launch.
- Gaps item 29: no marque filter. Theme chips are tags, and "All" is the default; the chip never hides a meet that carries `all`.
- The glass chip count (four chips plus locate me) is at the edge of the "handful" rule. Default: chips share one `GlassContainer`; if frame drops appear over satellite tiles, collapse Theme and Distance into one "Filters" chip that opens a sheet.
- `following` mixes events and posts; the post card is owned by photos-and-posts.md and renders as a placeholder until Phase 4.

## Session breakdown

| Slice | Deliverable | Covers | Must pass |
|---|---|---|---|
| 1 (Phase 1) | `GET /events` bbox, `sort`, `q` without `near`; `GET /events/map` with `recurring`; rswag specs; Solid Cache on feed | R-7 to R-9, R-24 | AC-5 to AC-7 |
| 2 (Phase 1) | `GET /feed` sections with the R-6 windows, omission rules, anonymous handling | R-5, R-6, R-3 | AC-1, AC-2, AC-4 |
| 3 (Phase 1) | S01 onboarding, location permission, geocoding, default region, device home location | R-1, R-2, R-4, R-10, R-11 | AC-8 to AC-10 |
| 4 (Phase 1) | S02 feed with sections, EventCard, empty and widen, pull to refresh, MMKV persistence | R-12 to R-14 | AC-11 to AC-13 |
| 5 (Phase 1) | `packages/ui/map` supercluster wrapper, S03 map with pins, sheet, search this area, truncated | R-15, R-16, R-18, R-19 | AC-14 to AC-16, AC-18 |
| 6 (Phase 1) | Glass chips with fallback, filters wired to both queries, S04 sorts | R-17, R-18 | AC-17 |
| 7 (Phase 1) | S05 search with recents, groups, search everywhere, place jump | R-20, R-21 | AC-20 to AC-22 |
| 8 (Phase 4) | `recent_photos` and `spots_nearby` sections in feed and client; Spots layer toggle | R-5, R-22 | AC-3, AC-19 |

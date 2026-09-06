# Spec: Public web

Status: draft. Phase: 1 (W01 to W09, W12, W14, W15), 2 (W16 legal, story format on W14), 4 (W10, W11, W13). Last updated: 2026-09-06.
Depends on: events-and-occurrences.md, discovery.md (feed sections, cluster wrapper), event-detail-and-rsvp.md (detail blocks, story layout), clubs.md, sponsors.md, spots.md and photos-and-posts.md (Phase 4 pages), design-system-and-theming.md (tokens CSS). Related decisions: ADR 0005, ADR 0011, gaps items 2, 10, 18.

## Summary

The web app is the no-install path and the growth loop: crawlable event, club, sponsor, and city pages that rank for "cars and coffee <city>", link previews that unfurl in iMessage and Instagram, directions, and a map. It is read-only at launch (gaps item 10): anything that needs an account opens the app or the App Store. Pages are server-rendered by React Router v7 loaders calling the Rails API without a token, styled from the same tokens as mobile, flat with a glass header only.

## User stories

| Id | Story |
|---|---|
| US-1 | As a browser landing from Google, I want an event page with the next dates, the lot, the host, and directions so that I can go without installing anything. |
| US-2 | As a browser, I want a page for my city that shows this weekend's meets so that one bookmark answers Friday night. |
| US-3 | As anyone receiving a link in iMessage or Instagram, I want a rich preview with the title, date, venue, and cover so that I know what it is before tapping. |
| US-4 | As an iPhone user with the app installed, I want a shared link to open the app, and otherwise a clear way to get it, so that RSVP is one tap away. |
| US-5 | As a browser, I want club, sponsor, and profile pages on the web so that a host can link their page from an Instagram bio. |
| US-6 | As a browser (Phase 4), I want spot and post pages so that photos and photo locations are shareable. |
| US-7 | As a crawler, I want a sitemap, robots, and structured data so that every public page is indexable and understood. |

## Scope

In Phase 1: W01 home, W02 meets list and search, W03 event page, W04 occurrence page, W05 map, W06 profile, W07 club directory, W08 club page, W09 sponsor page, W12 city pages, W14 OG image routes for meets, W15 sitemap, robots, and AASA, error pages, the Open in app banner, Playwright smoke, Vercel preview per PR.

In Phase 2: W16 legal pages as Markdown routes; the 9:16 story format on the W14 meets route (layout owned by event-detail-and-rsvp.md).

In Phase 4: W10 spot directory, W11 spot page, W13 post page with the Instagram embed, W14 OG route for spots, spots in the sitemap.

Not in this spec: W17 (sign in, create, import, club manage) is Phase 7 and out of scope here; it will get its own spec when web write surfaces are planned. Host dashboard (Later). Admin views (admin.md, Rails).

## Requirements

**Data**

- R-1 The web app MUST hold no database and no session at launch; every loader MUST call the API anonymously through `packages/api-client` with `X-Device-Id` from a cookie. (US-1)
- R-2 Browser geolocation on W01 and W05 MUST be rounded to two decimals before it is sent, and IP geolocation from Vercel headers MUST be used only server-side and never persisted. (US-2)

**API**

- R-3 The web app MUST use only endpoints in `docs/api.md`: `GET /feed`, `GET /events`, `GET /events/map`, `GET /events/:slug`, `GET /occurrences/:id`, `GET /users/:handle` and its `events`, `vehicles`, `clubs`, `GET /clubs`, `GET /clubs/:slug`, `GET /clubs/:slug/members`, `GET /sponsors/:slug`, `GET /sponsors/:slug/events`, and in Phase 4 `GET /spots`, `GET /spots/:slug`, `GET /spots/:slug/photos`, `GET /posts/:id`, `GET /posts/:id/embed`. (US-1, US-5, US-6)
- R-4 The sitemap MUST be built from `GET /sitemap` returning slugs and `updated_at` for published public events with an upcoming occurrence, active clubs, active sponsors, and visible spots. (US-7)

**Web**

- R-5 Every route in the Web pages table of `docs/screens.md` from W01 to W16 MUST exist at its listed path with a loader that returns the page data and a `meta` export with `title`, `description`, canonical, `og:title`, `og:description`, `og:image`, `og:url`, and `twitter:card` `summary_large_image`. (US-1, US-3)
- R-6 W03 MUST emit JSON-LD `Event` with `name`, `startDate`, `endDate`, `location` (`Place` with `PostalAddress` and `GeoCoordinates`), `organizer` (`Organization` for club and sponsor hosts, `Person` for users), `image`, `url`, `isAccessibleForFree: true`, `eventAttendanceMode` offline, `eventStatus` (`EventCancelled` when cancelled), `sponsor` entries from `sponsorships`, and, for recurring events, `eventSchedule` as a `Schedule` with `repeatFrequency`, `byDay`, `startTime`, `endTime`, `startDate`, and `endDate` from `rrule` and `rrule_until`. (US-1, US-7)
- R-7 W03 MUST render the same blocks as S08 in the same order with directions as an Apple Maps or Google Maps link by platform, MUST accept `?token=` for unlisted events, MUST show the cancelled banner and "Last confirmed" copy, and MUST render photos and comments as placeholders until Phase 4. (US-1)
- R-8 W04 MUST render one occurrence and MUST set canonical to the event URL unless `overridden_at` is set, in which case it is self-canonical. (US-1)
- R-9 W08 and W09 MUST emit JSON-LD `Organization` (`name`, `url`, `logo`, `sameAs` from `links`); W11 MUST emit JSON-LD `Place` (`name`, `geo`, `address`); W06 emits no JSON-LD. (US-5, US-6)
- R-10 The RSVP and Follow buttons on W03, W04, W06, W08, W09 and the create actions on W01 and W02 MUST NOT call write endpoints; on iOS they MUST link to `curb://` for the same object with a 1.5 s fallback to the App Store URL, and elsewhere to the App Store URL. (US-4)
- R-11 Every indexable page MUST emit `<meta name="apple-itunes-app" content="app-id=<APP_STORE_ID>, app-argument=<canonical URL>">` when `APP_STORE_ID` is set, and MUST show the in-page Open in app bar on iOS in-app browsers (Instagram, Facebook, Threads user agents) with a 7-day dismissal in `localStorage`. (US-4)
- R-12 W12 MUST exist for each slug in `apps/web/app/lib/cities.ts` (`newport-beach`, `corona-del-mar`, `laguna-beach`, `dana-point`, `san-clemente`, `rancho-cucamonga`, `fontana`), MUST call `GET /feed?near=<center>&radius_km=16`, MUST render the `this_weekend`, `next_week`, and `later` sections only, and MUST return 404 for unknown slugs. (US-2)
- R-13 W01 MUST show a city picker over the same list plus "Near me" (browser geolocation), and MUST load `GET /feed` near the Vercel IP coordinates rounded to two decimals, falling back to coastal Orange County (33.62, -117.93). (US-2)
- R-14 W02 MUST accept `q`, `city`, `tags`, and `from`, MUST set canonical to `/meets?city=<slug>` when only `city` is set and `/meets` otherwise, and MUST mark pages with `q` `noindex`. (US-1)
- R-15 W05 MUST be client-only (`clientLoader`, no SSR of the map), MUST use MapLibre GL JS with the OpenFreeMap tile style, MUST fetch `GET /events/map` for the bbox 300 ms after move end, MUST cluster with the `supercluster` wrapper from `packages/ui/map`, MUST list events in view beside the map, and MUST be `noindex`. (US-1)
- R-16 W14 `/og/meets/:slug.png` MUST render a 1200x630 PNG with Satori and resvg (cover through the photo treatment or the flat placeholder, serif title, thin rule, date, venue, wordmark; no gradients), MUST send `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`, MUST return the placeholder card for a missing cover, and MUST never include Instagram media; `?format=story` (Phase 2) MUST return 1080x1920 with a QR to the canonical URL; `/og/spots/:slug.png` (Phase 4) follows the same rules. (US-3)
- R-17 W15 `/sitemap.xml` MUST list W01, W02, W07, W12 pages, W16 pages, and every row from R-4 with `lastmod`, cached 1 h at the edge; `/robots.txt` MUST allow all, disallow `/map`, `/posts/`, `/og/`, `/new`, `/imports/`, `/sign-in`, and name the sitemap. (US-7)
- R-18 W15 `/.well-known/apple-app-site-association` MUST return `application/json` without redirect, with `applinks.details[0].appID` equal to `<TEAM_ID>.club.curbsocial.app` and `components` allowing `/meets/*`, `/occurrences/*`, `/u/*`, `/clubs/*`, `/sponsors/*`, `/spots/*`, `/posts/*` and excluding `/og/*`, `/sign-in`, `/new`; `webcredentials` MUST list the same app. (US-4)
- R-19 W13 (Phase 4) MUST load Instagram's embed script only on that route and only when `external_media.status` is `ok`, MUST render the unavailable card otherwise, and MUST never reference an Instagram image URL in `meta` or the OG route. (US-6)
- R-20 W16 MUST render `/terms`, `/privacy`, `/guidelines`, and `/bot` from Markdown files in `apps/web/content/legal/` at build time with a last-updated line. (US-7)
- R-21 A 404 MUST render "Not found" with up to three nearby meets from `GET /feed` (IP location, fallback coastal Orange County); a hidden or cancelled object MUST render the "no longer listed" page with status 410 and the `nearby` rows from the API; both keep the header. (US-1)
- R-22 The root layout MUST load tokens CSS, set `data-theme` from a cookie (default `marine-layer`) and appearance from `prefers-color-scheme`, use `backdrop-filter` only on the header, and keep `pageMax` 1120 px and `readingMax` 640 px. (US-1)

**Admin and jobs**

- R-23 Vercel MUST build a preview per PR pointing at the staging API and production on `main`; `API_URL`, `APP_STORE_ID`, `TEAM_ID`, and `SHARE_BASE_URL` MUST be environment variables with no defaults committed. (US-7)

## Data

None owned. Reads the public shapes named in R-3. Legal Markdown lives in the repo. No cookies except `curb_device` (device id) and `curb_theme`. No migration.

## API

Read only: the endpoints in R-3 plus `GET /sitemap` (R-4). Web-served resources: `/og/meets/:slug.png` (`format=story` in Phase 2), `/og/spots/:slug.png` (Phase 4), `/sitemap.xml`, `/robots.txt`, `/.well-known/apple-app-site-association`. Unlisted events pass `token` through to `GET /events/:slug`.

## Screens and states

| Screen id | Screen | Route (mobile / web) | Primary actions | States |
|---|---|---|---|---|
| W01 | Home | none / `/` | Pick a city, Near me, open a card, Get the app | SSR (no loading), empty (no sections), error |
| W02 | Meets list and search | S04, S05 / `/meets` | Search, filter, open a card, Add a meet (app) | empty, no results, error |
| W03 | Event page | S08 / `/meets/:slug` | Directions, Add to calendar (.ics), Share (copy link), I'm going (app), date rows | cancelled, unclaimed, unlisted (token), no longer listed (410), not found (404) |
| W04 | Occurrence page | S09 / `/meets/:slug/:occurrenceId` | Same as W03 for one date | cancelled, past |
| W05 | Map | S03 / `/map` | Pan, cluster, list, Locate me | loading (client), empty, truncated, error |
| W06 | Profile | S11 / `/u/:handle` | Open hosted meets, clubs, socials | not found |
| W07 | Club directory | none / `/clubs` | Open a club | empty |
| W08 | Club page | S12 / `/clubs/:slug` | Open meets, members, Follow (app) | hidden (404) |
| W09 | Sponsor page | S14 / `/sponsors/:slug` | Website, open meets, Follow (app) | hidden (404) |
| W10 | Spot directory (4) | none / `/spots` | Open a spot | empty |
| W11 | Spot page (4) | S15 / `/spots/:slug` | Directions, photos | no photos, access warning |
| W12 | City page | none / `/socal/:city` | Open a card, Get the app | empty, unknown city (404) |
| W13 | Post page (4) | S16 / `/posts/:id` | Open profile, open meet | instagram unavailable, hidden (410) |
| W14 | OG card | none / `/og/meets/:slug.png`, `/og/spots/:slug.png` | none | placeholder cover, 404 |
| W15 | Sitemap, robots, AASA | none / `/sitemap.xml`, `/robots.txt`, `/.well-known/apple-app-site-association` | none | none |
| W16 | Legal (2) | none / `/terms`, `/privacy`, `/guidelines`, `/bot` | none | none |

## Copy

| Where | String |
|---|---|
| Site title suffix | curb |
| W01 headline | This weekend, within 20 miles. |
| W01 city picker label | Pick a city |
| W01 near me | Near me |
| W01 empty | Nothing listed near here yet. Pick a city or get the app to add one. |
| W01 and W12 section titles | This weekend, Next week, Later |
| W02 search placeholder | Search meets, clubs, places |
| W02 no results | Nothing for "{query}". Try a city, a host, or a day. |
| W03 RSVP button | I'm going |
| W03 RSVP helper | Opens curb. Get it on the App Store if you don't have it. |
| W03 calendar | Add to calendar |
| W03 directions | Directions |
| W03 share | Copy link, Link copied |
| W03 unclaimed | Unclaimed. Are you the host? Claim it in the app. |
| W03 last confirmed | Last confirmed Jul 12 |
| W03 cancelled banner | Cancelled this week. Host note: rain. |
| W03 source card | Originally posted on Instagram by @backbayaircooled. |
| W03 photos placeholder | Photos go here after the meet. |
| W05 truncated | Zoom in to see all meets here. |
| W05 empty | No meets here. Zoom out, or add the one you know about in the app. |
| W07 title | Clubs in Southern California |
| W08 and W09 follow | Follow in the app |
| W09 kind labels | Sponsor, Vendor, Venue partner |
| W12 title | cars and coffee in Newport Beach |
| W12 description (meta) | Every car meet within 10 miles of Newport Beach this weekend, with times, lots, and hosts. |
| W12 empty | Nothing listed in Newport Beach this weekend. Try a nearby city. |
| W13 unavailable | This Instagram post is no longer available. Open it on Instagram. |
| Open in app bar | Open in curb |
| Open in app bar, no app | Get curb on the App Store |
| Smart banner fallback link | Get the app |
| 404 headline | Not found. |
| 404 body | That page isn't here. Nearby this weekend: |
| 410 headline | This meet is no longer listed. |
| 410 nearby header | Nearby this weekend |
| Footer | hello@curbsocial.club. Terms. Privacy. Guidelines. |

## Acceptance criteria

| Id | Given | When | Then | Proves |
|---|---|---|---|---|
| AC-1 | A seeded recurring event with a cover, a club host, and one sponsorship | `curl https://<preview>/meets/:slug` | 200; `og:title`, `og:image` pointing at `/og/meets/:slug.png`, canonical, and `apple-itunes-app` present; JSON-LD parses as `Event` with `eventSchedule.byDay`, `organizer.@type` `Organization`, and one `sponsor` | R-5, R-6, R-11 |
| AC-2 | A one-off cancelled event | `curl /meets/:slug` | JSON-LD has no `eventSchedule` and `eventStatus` is `EventCancelled`; the banner text is in the HTML | R-6, R-7 |
| AC-3 | An `unlisted` event | `curl /meets/:slug`, then with `?token=` | 404 then 200; the page is absent from `/sitemap.xml` | R-7, R-17 |
| AC-4 | An occurrence with `overridden_at` set and one without | Both W04 pages are fetched | The first is self-canonical; the second's canonical is the event URL | R-8 |
| AC-5 | A club and a sponsor page | `curl /clubs/:slug` and `/sponsors/:slug` | Each has JSON-LD `Organization` with `sameAs` from links; a hidden club returns 404 | R-9 |
| AC-6 | W03 in Playwright with an iPhone user agent | I'm going is clicked | The navigation attempts `curb://meets/:slug`, then after 1.5 s the App Store URL; no request hits `/occurrences/*/rsvp` | R-10 |
| AC-7 | W03 in Playwright with an Instagram in-app user agent | The page loads, the bar is dismissed, the page reloads | The Open in app bar shows, then stays hidden | R-11 |
| AC-8 | `/socal/newport-beach` and `/socal/nowhere` | Both are fetched | 200 with the three sections at most and the meta description; 404 for the second | R-12 |
| AC-9 | `/` fetched with `x-vercel-ip-latitude: 33.6189` and longitude `-117.9289` | The Rails log is inspected | `GET /feed` was called with `near=33.62,-117.93` | R-2, R-13 |
| AC-10 | `/meets?city=laguna-beach` and `/meets?q=porsche` | Both are fetched | The first's canonical is itself; the second carries `noindex` | R-14 |
| AC-11 | W05 in Playwright with 40 pins in a bbox | The map loads and is panned | One `GET /events/map` after settling, clusters render, the side list matches the pin count | R-15 |
| AC-12 | An event with a cover, one without, and one with an Instagram post | `/og/meets/:slug.png` for each | 1200x630 PNG, `s-maxage=3600`; the second shows the placeholder; none embeds Instagram bytes | R-16 |
| AC-13 | Phase 2: any published event | `/og/meets/:slug.png?format=story` | 1080x1920 PNG with a QR that decodes to the canonical URL | R-16 |
| AC-14 | `/sitemap.xml` and `/robots.txt` | Both are fetched | The sitemap validates, lists every city and W16 page and every published event slug with `lastmod`; robots disallows `/map` and names the sitemap | R-17 |
| AC-15 | `/.well-known/apple-app-site-association` | `curl -sI` and `curl -s` | 200, `content-type: application/json`, no `location` header; body has the `appID` and the `components` list | R-18 |
| AC-16 | A physical iPhone with the app installed | A `/meets/:slug` link is tapped in Notes | The app opens S08; with the app removed, Safari opens W03 with the smart banner | R-11, R-18 |
| AC-17 | Phase 4: a post of kind `instagram` with status `ok` and one with `unavailable` | Both W13 pages are fetched | The first HTML references `instagram.com/embed.js`; the second renders the unavailable card and no embed script; neither `meta` carries an Instagram image | R-19 |
| AC-18 | Phase 2: `/privacy` | The page is fetched | The Markdown renders with the last-updated line and is in the sitemap | R-20 |
| AC-19 | A slug that does not exist and a slug the API returns 410 for | Both are fetched | 404 with three nearby cards; 410 with the API's `nearby` rows; the header renders in both | R-21 |
| AC-20 | A PR is opened | Vercel finishes | A preview URL is posted on the PR and `curl <preview>/` returns 200 | R-23 |

## Verification

| Check | How |
|---|---|
| Unit | `pnpm --filter @curb/web test` (Vitest) for `seo.ts` JSON-LD builders (AC-1, AC-2 shapes), city list, deep-link helper |
| Smoke | `pnpm --filter @curb/web test:e2e` runs Playwright against MSW-mocked API fixtures in CI for AC-1 to AC-12, AC-14, AC-15, AC-17 to AC-19; nightly against staging |
| OG | `pnpm --filter @curb/web test:og` snapshots the three cards in AC-12 |
| Device | AC-16 on a physical iPhone; also paste the link in iMessage and Instagram DM and confirm the unfurl shows the card |
| Design | Figma page "Web", frames "Event", "City", "Home"; cards against `brand/previews/`; flat check per design-system-and-theming.md |

## Risks and open questions

- Adopted 2026-09-06 into docs/api.md: add `GET /sitemap` returning `{ events: [{ slug, updated_at }], clubs, sponsors, spots }` for public rows, cached 1 h, so the sitemap does not page through `GET /events`.
- Adopted 2026-09-06 into docs/api.md: `GET /events/:slug` accepts `token` and returns 410 with `nearby` (raised in event-detail-and-rsvp.md).
- Adopted 2026-09-06 into docs/screens.md: W04 mobile route is `occurrences/[id]`, so the AASA components include `/occurrences/*` in addition to `/meets/*/*`. Default: both patterns allowed.
- Gaps item 2: domain unconfirmed. Default: `SHARE_BASE_URL` and the AASA are environment-driven; nothing hardcodes `curbsocial.club` outside `.env.example`.
- Gaps item 18: ADR 0005 is Proposed. Default: React Router v7; if it flips to Next.js, routes and loaders are rewritten and everything else here stands.
- The launch city list is seven slugs from the two rings. Default: extend `cities.ts` when a ring gets hosts; a city page with no meets stays live with its empty copy rather than 404, to keep the URL indexable.
- `APP_STORE_ID` is unknown until App Store Connect reserves the app. Default: the smart banner and fallback links render only when set; Playwright sets a fake id.
- OpenFreeMap has no SLA. Default: the style URL is an env var; MapTiler free tier is the swap.

## Session breakdown

| Slice | Deliverable | Covers | Must pass |
|---|---|---|---|
| 1 (Phase 1) | `create-react-router` scaffold with the Vercel preset, tokens CSS, theme cookie, root layout with glass header, device cookie, api-client wiring, error boundaries, Vercel preview | R-1, R-22, R-23 | AC-20 |
| 2 (Phase 1) | W03 and W04 with loaders, `meta`, JSON-LD builders in `seo.ts`, token passthrough, cancelled and unclaimed treatment, deep-link buttons, smart banner and in-app bar | R-5 to R-8, R-10, R-11 | AC-1 to AC-4, AC-6, AC-7 |
| 3 (Phase 1) | W14 OG route with Satori and resvg, placeholder card, edge cache | R-16 | AC-12 |
| 4 (Phase 1) | W01, W12 with `cities.ts`, W02 with canonical rules, IP geolocation rounding | R-2, R-12 to R-14 | AC-8 to AC-10 |
| 5 (Phase 1) | W06, W07, W08, W09 with `Organization` JSON-LD | R-9 | AC-5 |
| 6 (Phase 1) | W05 client-only MapLibre with the shared cluster wrapper and side list | R-15 | AC-11 |
| 7 (Phase 1) | W15 sitemap (with `GET /sitemap`), robots, AASA, 404 and 410 pages, Playwright suite in CI | R-4, R-17, R-18, R-21 | AC-3, AC-14 to AC-16, AC-19 |
| 8 (Phase 2) | W16 Markdown legal routes; story format on W14 | R-16 (story), R-20 | AC-13, AC-18 |
| 9 (Phase 4) | W10, W11 with `Place` JSON-LD, W13 with the gated Instagram embed, spots OG route, spots in the sitemap | R-9 (W11), R-16 (spots), R-19 | AC-17 |

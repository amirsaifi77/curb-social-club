# Cars and Coffee: Development Plan

Status: draft v0.1, 2026-09-05. Audience: Amir, solo builder at 10 to 15 hours per week, using Claude Code for most implementation. Companion docs: `docs/business-plan.md`, `docs/app-overview.md`.

## Planning assumptions

- Capacity is roughly 50 hours per month. Each phase below is sized in weeks of that cadence, not full-time weeks.
- Claude Code handles scaffolding, migrations, tests, API clients, and boilerplate screens. The builder's time goes to product decisions, review, design polish, integration debugging, and everything that touches real hosts and real meets.
- Stack as decided in the brief: Rails 8 API with Postgres and PostGIS, Expo (latest SDK) with Expo Router, React Router v7 (framework mode, SSR) on Vercel for web per ADR 0005, pnpm workspaces with Turborepo, Render or Fly.io for the API.
- The scaffold in `research/` (apps, packages, tooling) is a starting point and should be audited in Phase 0 rather than rebuilt.
- iOS only until after launch. Android builds are not blocked by the stack but are not tested or shipped.

## Phases

### Phase 0: Foundations (October 2026, about 4 weeks)

Goal: a deployable skeleton on every tier so every later phase ships to a real environment.

Scope: monorepo with pnpm and Turborepo, GitHub Actions running lint, typecheck, Rails tests, and an Expo type build. Rails API skeleton with PostGIS enabled, health endpoint, versioned JSON API, Solid Queue for jobs, ActiveStorage to R2. Expo app shell with Expo Router, Liquid Glass tab bar (Home, Map, Create, Me), design tokens package (colors, type scale, spacing, radii, glass materials), a shared API client package generated from an OpenAPI spec. Auth: Sign in with Apple and Google producing a session token, anonymous browse by default, account deletion endpoint. Deploy pipeline: API to Render or Fly staging on merge to main, web to Vercel preview per PR, EAS development build installable on the builder's phone. Sentry on all three.

Exit criteria: a stranger can install a dev build, see four tabs, sign in with Apple, and hit a live staging API. CI is green and blocks merges.

### Phase 1: Read-only discovery (November to mid December 2026, about 6 weeks)

Goal: the app is useful with zero user-generated content, because the schedule is seeded.

Scope: Event, Venue, Host, RecurrenceRule, Occurrence models with PostGIS geography columns and a nightly occurrence materializer. Admin-only Rails views (or a rake task plus CSV) for seeding. Seed 50 or more SoCal meets by hand with correct recurrence, venue pins, and source links. Proximity and bounding box endpoints with filters (date range, distance, theme, recurring). Feed, Map with clustering and bottom sheet, List, Search over events and places, Event detail with source attribution and directions. Onboarding with area picker and approximate location. Web: React Router v7 app with event pages, city pages, host pages, OG tags, sitemap.

Exit criteria: open the app in Fontana, see this weekend's meets on the map and feed within two seconds, tap through to detail, get directions. Google can index an event page. 50 seeded meets verified against their sources.

### Phase 2: Creation (mid December 2026 to January 2027, about 5 weeks, holiday adjusted)

Goal: hosts and users can add and maintain meets without the builder.

Scope: manual create form with recurrence and exceptions, edit and delete, host pages and claim flow with manual review, host controls (cancel occurrence with note), RSVP with going and interested, reminder and cancellation push via Expo, Share with Universal Links and rich previews, profile and garage basics, report and block, admin moderation queue, settings with account deletion.

Exit criteria: a host in the beta group creates a recurring meet, claims it, cancels one week, and RSVP'd users receive the push. Report on an event lands in the admin queue.

### Phase 3: Import from link (February 2027, about 4 weeks)

Goal: the signature feature works for the two most common cases, and the architecture accepts new sources without touching the app.

Scope: ImportJob model and background pipeline: fetch (with per-source adapter), normalize to text and metadata, extract via LLM with a strict JSON schema and per-field confidence, geocode, duplicate check. Adapters: Evite first, then generic Open Graph plus page text, then paste-text fallback. App: paste-link entry, staged progress, draft preview with confidence indicators, edit, attribution block, publish. Store raw fetch and extraction for offline evaluation. A small eval set of 30 real links with expected fields, run in CI against the extractor.

Second half of the phase, in order and only as time allows: Eventbrite, Meetup, Partiful, Instagram (public post via oEmbed or paste caption), flyer OCR via vision model.

Exit criteria: 70 percent of Evite and generic links publish without a manual fix to date or venue on the eval set. Adding a new adapter is one file plus tests.

### Phase 4: Social (March 2027, about 4 weeks)

Goal: meets feel alive and there is a reason to come back between weekends.

Scope: photos and posts on occurrences with upload progress and blurhash placeholders, image safety filter on upload, comments with host badges, follow people, check-in with proximity, notification types for followed hosts and nearby weekly digest, activity strip on Home.

Exit criteria: photos from a real meet appear on the event within minutes of posting, a reported photo can be hidden from the admin queue, and the weekly digest goes out to opted-in users.

### Phase 5: TestFlight beta with local hosts (mid February to April 2027, overlapping Phases 3 and 4)

Goal: real hosts and real attendees use the app on real weekends, and feedback shapes the last month before launch.

Scope: recruit 5 to 10 host partners and 30 to 50 attendees, TestFlight external group, in-app feedback button that opens a prefilled email or form, weekly changelog, a simple analytics event stream (screen views, RSVP, share, import outcomes) with a dashboard the builder can read on Sunday night. Attend meets with QR flyers. Iterate on import quality using real links from hosts.

Exit criteria: at least five claimed meets kept current by their hosts for four consecutive weeks, 100 weekly active browsers, no P1 bugs open for more than a week, and the App Store submission checklist below is fully green.

### Phase 6: App Store launch and web launch (May 2027, about 3 weeks)

Goal: public availability in the launch region with a working growth loop.

Scope: App Store listing (screenshots in Liquid Glass style, preview video, keywords), submission with reviewer notes on UGC controls and the demo account, web launch with city pages indexed, Instagram roundup cadence, coffee shop QR cards placed, press note to local car media and IE community pages.

Exit criteria: approved and live, web indexed, first week of public metrics captured against the targets in the business plan.

## Milestone table

| Month | Milestone | Phase |
|---|---|---|
| October 2026 | Monorepo, CI, Rails and Expo skeletons, auth, staging deploys | 0 |
| November 2026 | Event model, PostGIS queries, 50 seeded meets, Map and Feed | 1 |
| December 2026 | Event detail, Search, web event and city pages, manual create started | 1 to 2 |
| January 2027 | Create, recurrence, hosts and claim, RSVP, share, report and block | 2 |
| February 2027 | Import pipeline with Evite and generic adapters, TestFlight internal, first hosts onboarded | 3, 5 |
| March 2027 | More adapters, photos, comments, follows, notifications, external TestFlight | 3 to 5 |
| April 2027 | Beta hardening, moderation tooling, App Store assets, legal docs final | 5 |
| May 2027 | App Store submission and launch, web launch | 6 |
| June 2027 | Post-launch fixes, first growth iteration, decide on Android and host dashboard | Post-launch |

## Weekly cadence

| Slot | Time | Use |
|---|---|---|
| Two weeknights | 2 to 3 hours each | Feature work with Claude Code: one scoped task per session, ending in a PR |
| Saturday morning | 2 to 4 hours | Product time: attend a meet during beta, seed and verify meets, talk to hosts, take photos |
| Sunday | 3 to 4 hours | Review PRs, merge, deploy, write next week's tasks, update the changelog and metrics |

Rules that keep the cadence honest: one feature branch at a time, every session ends with something merged or a written stopping note in the PR, and Sunday planning writes the exact prompts for the next two Claude Code sessions.

## What to defer

Android, host web dashboard, Facebook importer (API access is unreliable, keep paste-text), threaded comments, direct messages, ticketing, monetization surfaces of any kind, venue self-service pages, automated host verification, multi-region expansion tooling, Apple Watch and widgets (a "this weekend" widget is tempting but is a post-launch treat), localization.

## Definition of done for MVP

- A logged-out user in the launch region sees accurate meets for the coming weekend on map, list, and feed, with detail and directions.
- A host can create a recurring meet manually or from an Evite or generic link, claim it, edit it, and cancel a week.
- Signed-in users can RSVP, receive a reminder and a cancellation push, share an event with a rich preview, and report or block.
- Public web pages exist for every event, host, and launch city, are indexed, and unfurl correctly in iMessage and Instagram.
- Account deletion, Sign in with Apple, privacy policy, terms, and community guidelines are live in the app.
- At least 100 meets seeded or created, at least 5 claimed by hosts.
- Crash-free sessions above 99 percent over the last two beta weeks.

## Testing strategy

| Layer | Approach |
|---|---|
| Rails | Model and request specs with RSpec, factories, PostGIS queries tested against real geography fixtures, importer adapters tested with recorded HTTP fixtures (VCR) plus the 30-link eval set for extraction quality |
| Shared packages | Vitest for the API client and utilities, contract test that the generated client matches the OpenAPI spec |
| Mobile | Component tests with React Native Testing Library for cards, forms, and confidence indicators; Maestro flows for the five core journeys (browse, RSVP, create, import, share) run against staging before each TestFlight build |
| Web | Playwright smoke on event, city, and host pages including OG tag assertions |
| Manual | A weekly checklist run on a physical iPhone on the current iOS, covering permissions, offline, deep links, and account deletion |
| Monitoring | Sentry on all tiers, import job success rate and latency on a dashboard, alert on job failure rate above 20 percent |

## App Store submission checklist

- Distinctive app name cleared for trademark conflicts (see business plan risk) and reserved in App Store Connect.
- Sign in with Apple offered alongside Google (guideline 4.8, [WorkOS](https://workos.com/blog/apple-app-store-authentication-sign-in-with-apple-2025)).
- In-app account deletion that removes account and content (guideline 5.1.1(v), [Apple](https://developer.apple.com/news/?id=12m75xbj)).
- UGC safeguards: report on every content type, block users, terms accepted at signup, published contact email, reviewer notes describing the moderation queue and 24 hour response ([AcceptMyApp](https://acceptmy.app/guidelines/1-2-user-generated-content)).
- Location permission strings explain the purpose; approximate location works; the app functions when denied.
- App Privacy label filled for location, user content, photos, identifiers, contact info, and usage data; privacy policy URL live.
- Demo account with seeded data for reviewers, plus a reviewer note explaining anonymous browse.
- Age rating set for 13+ with no restricted content flags.
- Universal Links AASA file served from the web domain and verified.
- Push notification entitlement and a working test on a fresh install.
- Screenshots for all required device sizes, app preview optional, keywords and subtitle written.
- Export compliance answered (standard encryption only).
- Crash-free rate and no debug menus or test endpoints reachable.

## First 10 sessions with Claude Code

1. Audit the existing scaffold in `research/`, decide keep or restart, and set up pnpm workspaces plus Turborepo with `apps/api`, `apps/web`, `apps/mobile`, `packages/tokens`, `packages/api-client`, `packages/types`.
2. Rails 8 API-only app with PostGIS, RSpec, Solid Queue, health endpoint, Dockerfile, and a GitHub Actions workflow running specs against a PostGIS service container.
3. Expo app with Expo Router, Liquid Glass tab bar, tokens package wired in, dark and light themes, and an EAS development build profile.
4. Auth end to end: Sign in with Apple and Google on the client, token exchange and session model on the API, anonymous session for browse, account deletion endpoint.
5. Domain models and migrations: Event, Venue, Host, RecurrenceRule, Occurrence, with the nightly materializer job and PostGIS indexes, plus factories and specs.
6. Proximity endpoints: radius and bounding box queries with filters and clustering, OpenAPI spec, generated TypeScript client.
7. Seed tooling: a CSV format and rake task for meets, then a first batch of 20 real Inland Empire and OC meets with verified sources.
8. Map screen with MapKit, clustering, filter chips, and the bottom sheet list; Feed screen with date grouping and skeletons.
9. Event detail screen with source attribution, directions, share sheet, and Universal Link handling; web event page with OG tags.
10. ImportJob pipeline skeleton: adapter interface, generic Open Graph adapter, LLM extraction with JSON schema and per-field confidence, and the eval harness with the first 10 links.

## Risks and dependencies

| Risk or dependency | Impact | Plan |
|---|---|---|
| Expo SDK and Liquid Glass support maturity | Tab bar or glass components may need native fallbacks | Pin the SDK, keep a plain tab bar fallback, budget one upgrade sprint per quarter |
| Source sites block fetching (Evite, Instagram) | Import success rate drops | Paste-text fallback is always available; adapters degrade to generic |
| LLM cost or latency spikes | Import feels slow | Cache by URL, cap tokens, run extraction in a job with progress polling |
| Host recruitment slower than planned | Beta lacks real hosts | Builder acts as host of record for seeded meets; keep claim friction low |
| Solo bandwidth during holidays | December slips | Phase 2 is already holiday adjusted; protect Phase 1 exit criteria first |
| Apple review rejection on UGC or login | Launch slips by weeks | Follow the checklist above, submit two weeks before the target date |
| Name and trademark | Rename late is costly | Decide the public name by end of Phase 2 |

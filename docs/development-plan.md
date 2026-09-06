# Curb Social Club: Development Plan

Status: v0.3, 2026-09-06 (v0.2 was 2026-09-05). Audience: Amir, solo builder at 10 to 15 hours per week, using Claude Code for most implementation. Companion docs: `docs/specs/README.md` (what gets built, per feature), `docs/sessions.md` (the session prompts), `docs/screens.md` (every screen and its phase), `docs/business-plan.md`, `docs/app-overview.md`.

v0.3 folds in the scope added on 2026-09-06: polymorphic hosts with clubs and sponsors (ADR 0010), user profiles with connected socials and club memberships, follow across every host type, a sectioned feed that carries events, photos, clubs, and sponsors, Instagram posts through the share sheet (ADR 0011), and photo spots. It also replaces the one-line session list with `docs/sessions.md` and moves the launch target from May to June 2027, with the trade described under "Holding May".

## Planning assumptions

- Capacity is roughly 50 hours per month. Each phase below is sized in weeks of that cadence, not full-time weeks. A weeknight session is two to three hours and ends in a PR.
- Claude Code handles scaffolding, migrations, tests, API clients, and boilerplate screens from the specs in `docs/specs/`. The builder's time goes to product decisions, PR review, design polish on device, integration debugging, seeding and verifying meets, and everything that touches real hosts.
- Stack as decided: Rails 8 API with Postgres and PostGIS, Expo with Expo Router and Unistyles, React Router v7 framework mode on Vercel (ADR 0005, to be Accepted in session 0.8 or 1.16), pnpm workspaces with Turborepo, Render for the API (ADR 0008, to be Accepted in session 0.8).
- The repo skeleton (`apps/*` and `packages/*` placeholders, CI, docs) is audited in session 0.1 rather than rebuilt.
- iOS only until after launch. Android builds are not blocked by the stack but are not tested or shipped.
- Clubs and sponsors ship as seeded, read-only pages at launch; their membership and self-service surfaces are Phase 7. Public web is read-only at launch. Instagram photos come only through the share sheet and are never stored.

## Phases

Each phase lists the specs it draws from; the specs carry the requirements and acceptance criteria, and their "Session breakdown" tables are what `docs/sessions.md` turns into prompts.

### Phase 0: Foundations (October 2026, about 4 weeks, sessions 0.1 to 0.10)

Goal: a deployable skeleton on every tier so every later phase ships to a real environment.

Specs: design-system-and-theming, auth-and-accounts, admin (namespace and sign-in only).

Scope: monorepo with pnpm and Turborepo and green CI; Rails API skeleton with PostGIS, RSpec, rswag, Solid Queue, health endpoint, Dockerfile; design tokens package emitting TS and CSS for three themes in light and dark with a contrast gate; Expo app shell with four native Liquid Glass tabs (Home, Map, Create, Me), Unistyles themes, fonts, Settings with a theme picker, a dev-only component gallery, the primary CTA hook and button with its loading and confirmed states, and an EAS development build; auth end to end (Sign in with Apple and Google, opaque sessions, anonymous devices, account deletion); admin namespace with Google sign-in and Mission Control; staging deploys (Render, Vercel preview per PR) with Sentry on all three tiers; the OpenAPI to types to api-client pipeline. Design QA before exit: every Phase 0 screen reviewed on a physical iPhone in all six theme variants for flat rendering, recorded in `brand/previews/phase-0/`.

Exit criteria: a stranger can install a dev build, see four tabs, switch themes in Settings, sign in with Apple, delete the account, and hit a live staging API. The flat-rendering QA is signed off. CI is green and blocks merges.

### Phase 1: Read-only discovery (November to mid December 2026, about 7 weeks, sessions 1.1 to 1.17)

Goal: the app is useful with zero user-generated content, because the schedule is seeded, and clubs and sponsors exist as pages from day one.

Specs: events-and-occurrences, clubs (read-only slices), sponsors (read-only slices), admin (CRUD and CSV seeds), discovery, event-detail-and-rsvp (Phase 1 slices), profiles-and-follow (read-only profile), web.

Scope: one migration set for venues, events, occurrences, polymorphic host, clubs, memberships, sponsors, sponsorships, and claim requests; the materializer, cadence types, geo queries, decay, and host consistency; club and sponsor read endpoints with stubbed writes; the sectioned feed and search; admin CRUD for venues, events, occurrences, sponsorships, clubs, memberships, sponsors, and users; the CSV seed importer with dry run; 50 or more verified meets (25 coastal Orange County, 25 Inland Empire), about 10 clubs, and about 5 sponsors seeded; mobile onboarding, Home feed with clubs and sponsors sections, Map with clustering and the bottom sheet, List, Search, Event detail with directions, add to calendar, share, source attribution, sponsors block, and the unclaimed and stale treatment; Club, Club members, Sponsor, and read-only Profile pages; web home, meets list, event and occurrence pages with OG and JSON-LD, profile, club, sponsor, and city pages, map, sitemap, robots, AASA, 404 and 410.

Exit criteria: open the app in Newport Beach or Fontana, see this weekend's meets on the map and feed within two seconds, tap through to detail, open the host's club page, get directions. Google can index an event page and a club page. 50 seeded meets verified against their sources with a verification URL and date on each.

### Phase 2: Creation (mid December 2026 to end of January 2027, about 6 weeks, holiday adjusted)

Goal: hosts and users can add and maintain meets, identify themselves, and follow what they care about, without the builder.

Specs: create-and-host-tools, profiles-and-follow, event-detail-and-rsvp (RSVP, going list, story card), notifications (push registration, reminders, cancellations, claim results), moderation-and-safety (report, block, admin queue), admin (claim review, moderation queue), web (legal pages).

Scope: manual create form with recurrence, exceptions, announced and seasonal cadences, venue search, cover upload, and a host selector (self or a club you manage); edit; cancel an occurrence with a note; "Still happening?" confirmation; claim a meet as yourself or as a club, with manual review; RSVP going and interested with the animated primary CTA; going list; share with Universal Links and the story card; profiles with avatar, bio, connected socials, garage, and clubs section; edit profile; follow users, clubs, sponsors, and events; block; report on every content type with the admin queue; push for reminders, cancellations, and claim results; Settings with location, notification, and privacy controls; terms, privacy policy, and guidelines pages.

Exit criteria: a host in the beta group creates a recurring meet as their club, claims a seeded one, cancels one week, and RSVP'd users receive the push. A report on an event lands in the admin queue. A profile shows the host's Instagram and their club.

### Phase 3: Import from link (February 2027, about 4 weeks)

Goal: the signature feature works for the two most common cases, and the architecture accepts new sources without touching the app.

Specs: import-from-link.

Scope: the import pipeline (fetch with per-source adapter, normalize, LLM extraction with a strict JSON schema and per-field confidence, geocode, duplicate check); Evite by pasted or shared text, generic Open Graph plus page text, and the paste-text fallback; the share extension for links (Instagram post URLs are routed to the Phase 4 post composer and rejected with a clear message until then); the draft editor with confidence indicators, snippets, recurrence suggestions, and the locked attribution block; publish with rights confirmation for cover images; the 30-link eval set in CI. Second half, only as time allows: Eventbrite, Meetup, Partiful, Instagram caption, flyer OCR.

Exit criteria: 70 percent of Evite and generic links publish without a manual fix to date or venue on the eval set. Adding a new adapter is one file plus tests.

### Phase 4: Social (March to mid April 2027, about 6 weeks)

Goal: meets feel alive, photos have a home, and there is a reason to come back between weekends.

Specs: photos-and-posts, spots, notifications (follow-based, digest, inbox), moderation-and-safety (image safety filter, comment and photo moderation), discovery (spots layer, photo and spot feed sections), web (spot and post pages).

Scope: photo posts from the Photos picker with upload progress, EXIF stripping, blurhash, and the safety filter; Instagram posts from the share sheet rendered by oEmbed, never stored; comments with host badges; check-in with proximity; spots: tag a spot on a photo, pick or create one with duplicate detection, the Spot page, the Spots layer on the Map, the spot directory on web; follow-based notifications, the weekly digest, and the inbox; the recent photos and spots sections of the feed; activity strip on Home.

Exit criteria: photos from a real meet appear on the event within minutes of posting, an Instagram post shared from the share sheet renders on the event and on a spot, a reported photo can be hidden from the admin queue, the Spots layer shows a spot with photos, and the weekly digest goes out to opted-in users.

### Phase 5: TestFlight beta with local hosts (March to May 2027, overlapping Phases 3 and 4)

Goal: real hosts and real attendees use the app on real weekends, and feedback shapes the last month before launch.

Scope: recruit 5 to 10 host partners (at least two of them clubs) and 30 to 50 attendees; TestFlight external group; in-app feedback button; weekly changelog; a simple analytics event stream (screen views, RSVP, share, import outcomes, post and spot creation) with a dashboard the builder can read on Sunday night; attend meets with QR flyers; iterate on import quality using real links from hosts. The Meta app's oEmbed Read feature must be approved before the external group receives a build with Instagram posts enabled.

Exit criteria: at least five claimed meets kept current by their hosts for four consecutive weeks, 100 weekly active browsers, no P1 bugs open for more than a week, and the App Store submission checklist fully green.

### Phase 6: App Store launch and web launch (late May to June 2027, about 3 weeks)

Goal: public availability in the launch region with a working growth loop.

Scope: App Store listing under the name Curb Social Club (screenshots in the Marine Layer theme under Liquid Glass, preview video, subtitle "Early mornings, quiet lots, every meet within 20 miles", keywords including "cars and coffee"); submission with reviewer notes on UGC controls, the demo account, and how Instagram embeds work; web launch with city, club, sponsor, and spot pages indexed; Instagram roundup cadence from @curbsocialclub; coffee shop QR cards in Newport, Corona del Mar, Laguna, and Rancho Cucamonga; press note to local car media, marque club newsletters (the seeded clubs first), and coastal OC and IE community pages.

Exit criteria: approved and live, web indexed, first week of public metrics captured against the targets in the business plan.

### Phase 7: Post-launch (July 2027 onward)

In rough priority order, each behind its spec's feature flag: club membership, invites, roles, and management in the app and on the web (clubs.md slices 7 to 9); club claims; sponsor self-service on the web; web sign-in and RSVP; Instagram Login for Business and Creator accounts; host dashboard with RSVP export and analytics; Android with Material fallbacks; a "this weekend" widget; venue pages; personalized feed ranking; multi-region tooling.

## Milestone table

| Month | Milestone | Phase |
|---|---|---|
| October 2026 | Monorepo, CI, Rails and Expo skeletons, tokens and themes, auth, admin shell, staging deploys | 0 |
| November 2026 | Host migration, materializer, geo queries, clubs and sponsors endpoints, feed, admin CRUD, seed importer, first 20 meets | 1 |
| Mid December 2026 | Feed, Map, List, Search, Event detail, Club and Sponsor pages on mobile; web pages indexed; 50 meets seeded | 1 |
| January 2027 | Create, recurrence, hosts and claims, RSVP, share, profiles with socials, follow, report and block, reminder push | 2 |
| February 2027 | Import pipeline with Evite text and generic adapters, draft editor, TestFlight internal, first hosts onboarded | 3, 5 |
| March 2027 | Photos, Instagram posts, comments, spots model and tagging, external TestFlight | 4, 5 |
| Mid April 2027 | Spots layer and pages, digest and inbox, image safety filter, more adapters | 4, 5 |
| May 2027 | Beta hardening, moderation tooling, App Store assets, legal docs final, submission | 5, 6 |
| June 2027 | App Store launch and web launch | 6 |
| July 2027 | Post-launch fixes, first growth iteration, club membership and management, decide on Android | 7 |

### Holding May

The 2026-09-06 additions cost about three weeks: one in Phase 1 (clubs, sponsors, admin CRUD) and two in Phase 4 (Instagram posts and spots). The plan above absorbs them by moving launch to June. To hold a May launch instead, move the Spots layer and pages (spots.md slices for S15, the S03 layer, W10, W11) and Instagram posts (photos-and-posts.md Instagram slices) to the first month after launch; the spot model and photo tagging can still ship in Phase 4 so nothing is lost. Decide at the Phase 3 exit, when the real velocity is known.

## Weekly cadence

| Slot | Time | Use |
|---|---|---|
| Two weeknights | 2 to 3 hours each | One session from `docs/sessions.md` with Claude Code, ending in a PR |
| Saturday morning | 2 to 4 hours | Product time: attend a meet during beta, seed and verify meets, talk to hosts and clubs, take photos |
| Sunday | 3 to 4 hours | Review PRs, merge, deploy, write the next two session prompts from the specs, update `docs/STATUS.md`, the changelog, and metrics |

Rules that keep the cadence honest: one feature branch at a time; every session ends with something merged or a written stopping note in the PR; Sunday planning writes the exact prompts for the next two sessions using the template in `docs/sessions.md`; a spec that turns out wrong is fixed in the same PR as the code.

## What to defer

Android, host web dashboard, Facebook importer (API access is unreliable, keep paste-text), threaded comments beyond one level, direct messages, ticketing, monetization surfaces of any kind (including paid sponsor placement, which will need labeling when it exists), venue self-service pages, automated host verification, club membership and management before launch, sponsor self-service, Instagram Login, web sign-in and RSVP, multi-region expansion tooling, Apple Watch and widgets, localization.

## Definition of done for MVP

- A logged-out user in the launch region sees accurate meets for the coming weekend on map, list, and feed, with detail, directions, and the host (person, club, or sponsor) one tap away.
- A host can create a recurring meet manually or from an Evite or generic link, as themselves or as a club they manage, claim a seeded one, edit it, confirm it, and cancel a week.
- Signed-in users can RSVP, receive a reminder and a cancellation push, follow people, clubs, sponsors, and events, share an event with a rich preview, post photos from the Photos picker or an Instagram post from the share sheet, tag a spot, and report or block.
- Public web pages exist for every event, host, club, sponsor, spot, and launch city, are indexed, and unfurl correctly in iMessage and Instagram.
- Account deletion, Sign in with Apple, privacy policy, terms, and community guidelines are live in the app.
- At least 100 meets seeded or created, at least 5 claimed by hosts, at least 10 clubs and 5 sponsors with pages.
- Crash-free sessions above 99 percent over the last two beta weeks.

## Testing strategy

| Layer | Approach |
|---|---|
| Rails | Model and request specs with RSpec and factories; PostGIS queries tested against real geography fixtures (the coordinates in events-and-occurrences.md) with an `EXPLAIN` spec for the index; importer adapters and the Instagram oEmbed client tested with recorded HTTP fixtures (VCR); the 30-link eval set for extraction quality; job specs for the materializer, decay, reminders, quiet hours, and fan-out; a route sweep that every `/admin` route 302s for non-admins |
| Shared packages | Vitest for the tokens build and contrast gate, the API client, and utilities; a contract test that the generated client matches the OpenAPI spec |
| Mobile | Component tests with React Native Testing Library for cards, forms, chips, and confidence indicators; Maestro flows for the core journeys (browse, open a club, RSVP, create, import, post a photo, share) run against staging before each TestFlight build; the six-variant flat-rendering checklist on a physical iPhone at each phase exit |
| Web | Playwright smoke on event, club, sponsor, spot, and city pages including OG tag and JSON-LD assertions |
| Manual | A weekly checklist on a physical iPhone on the current iOS, covering permissions, offline, deep links, the share extension from Safari and Instagram, and account deletion |
| Monitoring | Sentry on all tiers; import job success rate and latency, oEmbed failure rate, and safety filter rejection rate on the admin dashboard; alert on any job failure rate above 20 percent |

## App Store submission checklist

- "Curb Social Club" cleared by a trademark search (see the business plan risk table for the Curb namespace), the intent-to-use application filed in classes 009 and 042, and the name reserved in App Store Connect.
- Sign in with Apple offered alongside Google (guideline 4.8, [WorkOS](https://workos.com/blog/apple-app-store-authentication-sign-in-with-apple-2025)).
- In-app account deletion that removes account and content (guideline 5.1.1(v), [Apple](https://developer.apple.com/news/?id=12m75xbj)).
- UGC safeguards: report on every content type (events, posts, comments, users, clubs, sponsors, spots), block users, terms accepted at signup, published contact email, reviewer notes describing the moderation queue, the image safety filter, and the 24 hour response ([AcceptMyApp](https://acceptmy.app/guidelines/1-2-user-generated-content)).
- Location permission strings explain the purpose; approximate location works; the app functions when denied; spot locations are places, not people, and photo location is opt-in.
- App Privacy label filled for location, user content, photos, identifiers, contact info, and usage data; privacy policy URL live.
- Instagram embeds: the Meta app has the oEmbed Read feature approved; reviewer notes explain that embeds are rendered from Instagram and never stored.
- Demo account with seeded data (meets, a club, a sponsor, a spot with photos) for reviewers, plus a reviewer note explaining anonymous browse.
- Age rating set for 13+ with no restricted content flags.
- Universal Links AASA file served from the web domain and verified for meets, occurrences, profiles, clubs, sponsors, spots, and posts.
- Push notification entitlement and a working test on a fresh install.
- Screenshots for all required device sizes in the default theme, app preview optional, keywords (including "cars and coffee") and subtitle written in the brand voice.
- Export compliance answered (standard encryption only).
- Crash-free rate and no debug menus or test endpoints reachable (the dev component gallery is excluded from release builds).

## Sessions

The session prompts live in `docs/sessions.md`: ten for Phase 0 and seventeen for Phase 1, written in full, plus the template Sunday planning uses for Phases 2 to 7. Each session is one slice from a spec's "Session breakdown" table, and its "Must pass" list is the spec's acceptance criteria for that slice.

## Risks and dependencies

| Risk or dependency | Impact | Plan |
|---|---|---|
| Expo SDK and Liquid Glass support maturity | Tab bar or glass components may need native fallbacks | Pin the SDK, keep a plain tab bar fallback, budget one upgrade sprint per quarter |
| Source sites block fetching (Evite, Instagram) | Import success rate drops | Text input is the primary path for both; adapters degrade to generic; never fetch Meta or Evite pages |
| Meta App Review for oEmbed Read | Instagram posts cannot ship to external testers until approved | Create the Meta app and request the feature in Phase 3; development mode covers internal testing; the Photos picker path does not depend on it |
| LLM cost or latency spikes | Import feels slow | Cache by URL, cap tokens, run extraction in a job with progress polling |
| Phase 4 is the heaviest phase | Spots and Instagram slip and compress beta | The "Holding May" trade is pre-decided; spots pages and Instagram are the first things to move post-launch |
| Host and club recruitment slower than planned | Beta lacks real hosts | Builder acts as host of record for seeded meets and owner of seeded clubs; keep claim friction low |
| Solo bandwidth during holidays | December slips | Phase 2 is already holiday adjusted; protect Phase 1 exit criteria first |
| Apple review rejection on UGC or login | Launch slips by weeks | Follow the checklist above, submit two weeks before the target date |
| Name and trademark | Resolved 2026-09-05: Curb Social Club (ADR 0009). Remaining exposure is the crowded "Curb" namespace | Clearance search and intent-to-use filing in classes 009 and 042 before Phase 5; App Store title is always the full name |
| Coastal seed gap | The research inventory has about six coastal Orange County meets; the small ones live in club calendars and group chats | Budget Saturday mornings in Phase 1 for on-the-ground seeding; recruit one club calendar owner as a source and seed that club; let the IE count lead early |
| Brand reads as exclusive | The coastal classic tone could put off first-timers and IE hosts | Two-way copy test in every design review; no marque filters or tiers; club and sponsor pages use the same layout as everything else |
| Spots on private property | Liability and neighbor complaints | Access kinds and notes on every spot, the `unauthorized_location` report reason, terms that require respecting posted rules, admin merge and hide |

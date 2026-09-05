# Gaps and Open Questions

Consolidated from the market research, architecture, product, mobile, and brand workstreams on 2026-09-05. Items are grouped by the decision they block. Each has a suggested default so work can continue if no decision is made; the default is what the current docs assume.

## Blocking before App Store submission

| # | Question | Why it matters | Suggested default |
|---|---|---|---|
| 1 | App name. Keep "Cars and Coffee" or choose a distinctive brand? | The phrase is descriptive at the USPTO (Cars and Coffee, Inc. holds only a class 25 clothing mark; its event-services filings were abandoned in 2022). It cannot be defended, App Store search will be crowded, and carsandcoffee.com is a pre-launch competitor on the exact-match domain. | Build under the working name through TestFlight. Pick a distinctive product name (brand guide lists Sunrise Meet, Lot, Curb, Idle, or a coined word) by Phase 5 and keep "cars and coffee" as the category term in copy. File intent-to-use in classes 009 and 042 once chosen. |
| 2 | Domain and Universal Links host | Universal Links, email, and OG cards all depend on a domain that is not confirmed. Changing it after launch breaks deep links in the wild. | Register a domain for the chosen name before Phase 2. The docs use carsandcoffee.app as a placeholder. |
| 3 | Legal entity and policies | Apple requires a privacy policy and terms; UGC apps need a moderation and reporting story (App Review 1.2). A California LLC costs $800 per year in franchise tax. | Form the LLC in Phase 4, publish terms and privacy policy on the web app, register a DMCA agent. |

## Product vision

| # | Question | Why it matters | Suggested default |
|---|---|---|---|
| 4 | What is the unit of truth: RSVP counts or host-confirmed "on this week" status? | Research found attendees mostly want to know whether this week's meet is happening, where to park, and what will show. RSVPs are noisy for free, recurring, walk-up events. | Model both. Show "Confirmed by host" and "Last confirmed" prominently; treat RSVP as soft interest. Add crowd signals ("I'm here", photo check-in) in Phase 4. |
| 5 | Who owns seeded meets? | About 70 recurring SoCal meets exist as seed data, but hosts have not claimed them. Unclaimed events need someone who can edit and cancel, and stale seeds erode trust fast (directories already have wrong venues and times). | The app account is host of record. Show "Unclaimed" with a claim button. Decay confidence if not confirmed in 30 days; hide after 90 days without activity. |
| 6 | How much of the seed list is verified against the organizer's Instagram before launch? | Directory data disagrees with organizers on venue, time, and status. | Verify every seeded meet by hand in Phase 1 (the plan budgets this). Store a source link and a verification date on each record. |
| 7 | Irregular cadences ("dates announced on IG", seasonal, first Fridays) | RRULE handles regular patterns. Announced-only meets need a way to exist without a false schedule. | Support cadence types: weekly rule, monthly rule, announced (no occurrences until the host posts), seasonal (rule with date bounds). |
| 8 | Launch region boundary | "SoCal / Inland Empire" is broad. Density beats breadth for a cold-start marketplace. | Phase 1 seeds concentrate on the Inland Empire plus Orange County (roughly 40 meets), with LA and San Diego added once IE hosts are active. |
| 9 | Venues as a first-class object at MVP? | Coffee shop and dealership partnerships are in the go-to-market, but venue pages are marked Later. | Keep the venues table in the MVP data model (it is already there for geo), defer venue profile pages. |
| 10 | Web scope at launch | Read-only SEO surface with RSVP redirecting to the app, or full sign-in and RSVP on web? | Read-only plus share and directions at launch. Web sign-in and RSVP in Phase 6 or later. |
| 11 | Contested lots, street takeovers, and liability | Some SoCal meets attract takeovers, and organizers fear shutdowns (Crystal Cove, Irvine, San Clemente permit fight). Listing a meet at a lot where the property owner objects creates exposure. | Terms require hosts to have venue permission. Add a "venue permission confirmed" flag to host claims and a report reason for "unauthorized location". Get a one-hour legal review before public launch. |
| 12 | Moderation SLA and backup | Solo builder is the moderator of record. What happens during vacation or a viral week? | Report queue with auto-hide after N reports, 24 hour SLA target during beta, a trusted host as backup moderator. |

## Import-from-link

| # | Question | Why it matters | Suggested default |
|---|---|---|---|
| 13 | Evite: what is acceptable? | Evite's terms (Sections 7, 8, 11) prohibit robots, scraping, and data mining, robots.txt disallows /event, and there is no API. Server-side fetching of Evite pages is off the table. | Primary path is user-pasted text or a share-sheet share from Evite into the app, then LLM extraction into a draft. At most a single device-side OG preview fetch initiated by the user. Confirm with a lawyer before shipping even that. |
| 14 | Instagram and Facebook | Meta bans automated collection for both, logged in or out. oEmbed is display-only. Facebook is the most common host channel. | Instagram: share-sheet share of a post into the app, then caption parsing and OCR of the image. Facebook: paste text only, no fetch. Never store Meta images. |
| 15 | Imported cover images | Copying an Evite or Instagram image is a rights problem even if the host pasted the link. | Imported events use a branded placeholder until the host uploads a photo or explicitly confirms rights. |
| 16 | LLM extraction vendor, cost, and privacy | Pasted invite text may contain names, addresses, and phone numbers. | Use a structured-output model call with PII minimization, do not log raw payloads beyond 30 days, budget about $10 to $30 per month at beta volume. Vendor choice is open. |
| 17 | Eventbrite and Meetup | Eventbrite has an official API but requires attribution and forbids storing past events. Meetup's API is behind a Pro subscription. | Eventbrite adapter by event ID in Phase 3. Meetup via JSON-LD on the public page as best effort. |

## Architecture and platform

| # | Question | Why it matters | Suggested default |
|---|---|---|---|
| 18 | Web framework: React Router v7 framework mode or Next.js | ADR 0005 is Proposed, not Accepted. Both work on Vercel; the API and mobile app are unaffected. | React Router v7 unless there is a strong Next.js preference. Decide before Phase 1 web work. |
| 19 | Hosting: Render or Fly.io | ADR 0008 is Proposed. Render has simpler managed Postgres with PostGIS; Fly has better edge and pricing flexibility. | Render at launch, Fly as migration target. |
| 20 | Expo SDK timing | SDK 57 is current, but Xcode 27 and iOS 27 (expected mid-September 2026) require the UIScene lifecycle that only SDK 58 canary supports. | Start on SDK 57 and move to SDK 58 as soon as it is stable, before any TestFlight build. |
| 21 | Maps provider | react-native-maps on Apple Maps is free on iOS and matches Liquid Glass; Mapbox costs money but gives custom styling and better clustering; expo-maps is still alpha with no clustering. | Apple Maps via react-native-maps with client-side supercluster. Revisit if Android or custom styling become priorities. |
| 22 | Analytics and privacy stance | The plan assumes a self-built event stream. Third-party SDKs change the App Privacy label. | Self-hosted events into Postgres for beta; consider PostHog self-hosted later. No ad SDKs. |
| 23 | Push notification policy | "New meet near you" can become noise quickly. | Weekly digest by default, immediate for followed hosts, hosts can send one announcement per event. |
| 24 | Android timing | Everything is iOS-first, but Expo makes Android cheap and a large share of car enthusiasts use Android. | Android build in Phase 6 with Material fallbacks already designed; no Android-specific features before then. |
| 25 | Ruby and Rails versions | Skeleton pins Ruby 3.3.6 and targets Rails 8.1. | Consider Ruby 3.4 before running rails new. |

## Brand and design

| # | Question | Why it matters | Suggested default |
|---|---|---|---|
| 26 | Amber primary vs morning-sky | Every asset depends on it. Amber was chosen because maps are cool-toned and glass takes its warmth from content beneath it. | Keep amber. |
| 27 | Logo mark ("cup on wheels") | It must read at 16px and survive a rename. | Review the previews at small sizes before committing. |
| 28 | Tab bar structure | Four tabs in the glass pill (Feed, Map, Activity, Profile) plus a trailing Create accessory button. | Keep, matches the iOS 26 idiom. |
| 29 | Pin taxonomy and confidence chip labels | "now, today, upcoming, recurring, past" and "Sure, Check, Guess" drive filters and copy. | Settle early; they are cheap to change now and expensive later. |
| 30 | Figma plan | The team is on Starter, which allows 20 MCP tool calls per month, one mode per variable collection, and three pages per file. Foundations and icons were built; components and screens are scripted but not run. | Upgrade to Professional with a Full seat (or run the eight scripts by hand in a later month) to finish the file. |

## Go-to-market

| # | Question | Why it matters | Suggested default |
|---|---|---|---|
| 31 | Which channel earns the first 1,000 Inland Empire users? | Candidates: meet photographers, venue partners, regional Facebook groups, or organizers linking the app in their Instagram bios. | Organizers first (5 to 10 hosts with the app in their bio), photographers second. |
| 32 | Host incentives without monetization | Hosts do double posting today; the app adds a third place to post unless it saves them work. | Import-from-link and "post once, share everywhere" cards are the pitch. Ask hosts what else they need in the Phase 5 interviews. |
| 33 | Relationship with carsandcoffee.com | A national aggregator on the exact-match domain may launch first. | Differentiate on local depth, host tools, and import. Watch for a launch and consider reaching out. |

## Things the docs assume that Amir has not confirmed

The stack (Rails 8 API, React, Expo), monorepo tooling (pnpm plus Turborepo), hosting (Render, Vercel, R2), auth (Sign in with Apple and Google, anonymous browse), private GitHub repo, solo nights-and-weekends cadence, and IE-first launch were all confirmed. Everything else in the docs marked Proposed, Suggested, or Placeholder is a judgment call by the planning workstreams and is open to change.

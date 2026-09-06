# Curb Social Club: Project Proposal and Business Plan

Status: draft v0.2, 2026-09-05 (v0.1 was written under the working title Cars and Coffee; renamed the same day, see ADR 0009). Owner: Amir. Companion docs: `docs/app-overview.md`, `docs/development-plan.md`, `docs/research/market-research.md`, `brand/brand-guide.md`.

## 1. Executive summary

Curb Social Club is a discovery and social platform for local car meets, launching as an iOS app with a public web presence. Weekend coffee meets ("cars and coffee" in the vernacular) are the most common form of grassroots car gathering in Southern California, yet there is no single place to find out what is happening this Saturday within 20 miles. Meets are announced on Instagram, in Facebook groups, on Evite, in group chats, and on flyers taped to a shop window. Information goes stale, hosts post the same thing four times, and newcomers never find the good ones.

The product is a shared schedule for the local scene: a map and list of upcoming meets near you, browsable without an account, with an import-from-link flow so hosts can paste the Evite, Instagram post, or flyer they already made and have a structured, searchable event in seconds. It links back to the source instead of competing with it.

The plan is deliberately small. One builder at 10 to 15 hours per week, heavy use of Claude Code, a launch geography of coastal Orange County with the Inland Empire as the second ring, and no monetization until the schedule is dense enough that people trust it. The first six months are judged on whether the app becomes the thing local enthusiasts open on Friday night to decide where to go Saturday morning.

## 2. Problem

Discovery of car meets is fragmented across channels that were not built for it.

| Channel | What it is good at | Where it fails for discovery |
|---|---|---|
| Instagram posts and stories | Reach, photos, host branding | Not searchable by date or location, stories expire in 24 hours, algorithm hides posts from most followers |
| Facebook groups and events | Recurring communities, RSVPs | Declining reach, throttled organic posts, events buried under memes and ads ([Radius](https://radius.to/facebook-events-alternative)) |
| Evite, Partiful | Invitations, headcount | Invite-only by design, nothing for the public to browse |
| Group chats (iMessage, WhatsApp, Discord) | Trusted, fast | Invisible to anyone not already in the chat |
| Flyers (physical and image) | Cheap, shareable | Unstructured, no date parsing, no map, no update when the meet is cancelled |
| Aggregator sites (CarsandCoffee.com, GarageApp, local blogs) | Broad lists | Stale listings, no local density, weak recurrence handling ([GarageApp guide](https://garageapp.com/blog/shows-events/cars-and-coffee-events-guide/)) |

The consequences are predictable. Attendees rely on word of mouth and show up to meets that were cancelled or moved. Hosts do double or triple posting and still get asked "is it on this week?" in the DMs. There is no source of truth for "what is happening near me this weekend," and the most reliable information lives in people's heads.

## 3. Solution and positioning

Positioning line: **the schedule for your local car scene.**

Brand line, for the landing page and App Store subtitle: **Early mornings, quiet lots, every meet within 20 miles.**

The app is integrated, not exclusive. Every event carries a link back to where it was originally announced, hosts keep posting wherever they already post, and attendees can browse without creating an account. The value we add is structure: a date, a place, a recurrence rule, a map pin, and a way to say "I'm going."

Three commitments shape every product decision.

1. Browse without an account. An account is only needed to post, RSVP, follow, or comment.
2. Import first, type second. Pasting a link or a flyer should be the default way to create an event.
3. Never paywall discovery. Finding a meet is free forever.

## 4. Brand direction

Quiet coastal classic luxury. The reference image is a small meet in Newport Beach at 7 am under the marine layer: overcast light, wet asphalt, a few air-cooled Porsches, paper cups. Understated over loud. Marine layer over sunshine. Editorial over app-store.

| Element | Direction |
|---|---|
| Name | Curb Social Club (formal), Curb Social (conversational), curb (in-app, lowercase). The curb is where the cars sit and where people stand and talk. |
| Palette | Flat. Solid fills, thin rules, generous whitespace. No gradients, glows, or glossy highlights. Three themes, each with light and dark variants: Marine Layer (default: fog white, overcast grey, wet-asphalt charcoal, muted slate blue, one Lido Blue #0E2A47 accent), Harbor (deep navy, bone white, warm sand, brass or ochre accent), Olive and Ivory (sage-olive, ivory, stone grey, burnt-sienna accent). |
| Type | Editorial serif for the wordmark and headlines (Instrument Serif preferred, Fraunces as alternate) and a grotesk for UI and body (Geist preferred, Inter as fallback). On iOS the system chrome stays SF Pro under Liquid Glass; the serif appears in headlines, event titles, and the wordmark. |
| Marks | Two directions under review: a custom lowercase "curb" wordmark with a CURB SOCIAL CLUB small-caps lockup, and a curb-profile monogram (the cross-section of a curb forming a C) that must work at 16 px and 1024 px. No car silhouettes, no Porsche references, no coffee-cup cliches. Allowed motifs: coastline, horizon, marine-layer band, curb geometry. |
| Voice | Calm, specific, dry. Name the place and the time. No hype words, no "exclusive," no "elite." |

### The beachhead persona

The first users the brand is written for: young to middle-aged owners of classic Porsches (and their neighbors with a 2002, an E-Type, a Land Cruiser) in Newport Beach, Corona del Mar, and Laguna. Wealthy but not flashy. They drive early, park at the far end of the lot, and leave before the crowd arrives. They dislike the 600-car institutional meets and the takeover crowd in equal measure. They find out about small meets through a Porsche club calendar, a group chat, or a friend, and they want to know two things: is it on this week, and who else is coming.

What wins them is accuracy, restraint, and taste: a schedule that is right, an interface that looks like a magazine rather than a dashboard, and no notifications they did not ask for.

### How this coexists with "not exclusive"

The product principle stands: every meet is listed and every car is welcome. The brand is a tone, not a velvet rope. Practically:

- The map shows the Fontana Saturday meet and the Newport Sunday meet with the same card, the same weight, and the same accuracy.
- Copy never ranks cars, marques, or people. "Bring whatever you drive" is still true in the app; it is just said quietly.
- The coastal classic persona sets the aesthetic bar and the launch geography. It does not set a filter. There is no "curated" tier, no invite code, no marque gate.
- The Inland Empire is the second ring, not a lesser one. The same seeding standard (verified against the organizer) applies there.

The test for any design or copy decision: would the beachhead persona find it tasteful, and would a first-timer in a stock Civic feel welcome. Both must be yes.

## 5. Target users and personas

| Persona | Who they are | Job to be done | What wins them |
|---|---|---|---|
| Coastal classic owner (beachhead) | Owns an air-cooled 911, a 356, a 912, or something similar; lives in or near Newport Beach; goes to small early meets and skips the big shows | "Is the Sunday meet on, and who is going?" | Accurate schedule, calm design, a following list of a few hosts, no noise |
| Browser (attendee) | Owns an enthusiast car or just likes them, goes to a few meets a year, often intimidated by the scene ([GarageApp guide](https://garageapp.com/blog/shows-events/cars-and-coffee-events-guide/)) | "What is on this Saturday near me, and is it still happening?" | Map, dates, photos from last time, no signup wall |
| Regular | Goes most weekends, follows several hosts, knows the circuit | Keep track of recurring meets, know when one is cancelled, see who else is going | Follow, reminders, RSVP counts, check-in |
| Host or organizer | Runs a weekly or monthly meet, often a small crew, promotes on Instagram or a club calendar | Reach people beyond followers without another chore | Import from link, claim the meet, one place that stays current |
| Venue | Coffee shop, dealership, tuning shop, brewery lot | Foot traffic on slow mornings, be known as car friendly | Venue page, recurring event association, later paid listing |
| Photographer | Shoots meets, posts on Instagram, wants credit and reach | Get photos in front of the people who were there | Photo posts tied to an event, attribution, profile link |

Secondary personas to keep in mind but not design for in MVP: car clubs (Porsche Club of America regions, Miata clubs, BMW CCA chapters), event promoters running ticketed shows, and parents bringing kids.

## 6. How meets are organized today

Meets in SoCal fall into three rough tiers. The big institutional ones (South OC Cars and Coffee in San Clemente, Supercar Sunday in Woodland Hills) have their own websites and Instagram presence and run on a fixed weekly cadence. Mid-size recurring meets are run by a shop, a dealership, or a small crew and are announced mostly on Instagram with an occasional flyer. Small ad hoc meets live in group chats, club calendars, and Instagram stories and appear a few days before. The coastal Orange County meets the beachhead persona attends sit almost entirely in the third tier, which is why the directories barely list them.

Almost all happen Saturday or Sunday morning, typically between 6 and 10 am, and run two to four hours ([GarageApp guide](https://garageapp.com/blog/shows-events/cars-and-coffee-events-guide/)). Consistency of schedule and venue is what keeps a meet alive; the ones that die are irregular, lose their lot, or burn out a solo organizer ([Jake Worth on running a meetup for ten years](https://www.jakeworth.com/posts/how-i-organize-a-meetup/)). This matters for product: recurrence is not an edge case, it is the default shape of the data.

Details, counts, and named meets by city are in `docs/research/market-research.md`, section 4.

## 7. Competitive landscape

Placeholder table. The research workstream will refine rows, add local players, and fill in the gaps.

| Product | Category | Strength | Gap for car meets | Notes |
|---|---|---|---|---|
| Instagram | Social | Where hosts already are | No structure, no search by date or place | We import from it, never replace it |
| Facebook Events and Groups | Social | Existing communities, RSVPs | Declining reach, throttled organic posts ([Radius](https://radius.to/facebook-events-alternative)) | Import target later; API access is restricted |
| Evite | Invitations | Familiar to older hosts | Private by default | First import target |
| Partiful | Invitations | Beautiful invites, no-account RSVP, share loop ([NoGood](https://nogood.io/blog/partiful-marketing-strategy/)) | Not discovery, not local | Model for RSVP UX and share cards |
| Meetup | Group platform | Recurring groups, discovery | Organizer fees, generic, weak for one-off meets | Model for consistency messaging to hosts |
| Eventbrite | Ticketing | Ticketed shows | Overkill for free meets | Import target |
| Strava Clubs | Fitness community | Local clubs, kudos loop, ambassadors ([Community Inc](https://community.inc/deep-dives/community-growth-strava)) | Different domain | Model for "support the community that already exists" |
| AllTrails, Untappd, Yelp Events | Local discovery | Map-first browse, UGC photos, check-ins | Not car specific | Model for map UX and check-in |
| GarageApp, AutoLNK, Spota | Car social apps | Car specific | Weak local density, walled gardens | Direct competitors; research doc to assess |
| CarsandCoffee.com and local blogs | Directories | SEO, long tail | Stale, no recurrence, no mobile | Web event pages compete here |

## 8. Why now

Three things line up in late 2026.

iOS 26 and Liquid Glass give a new app a design moment. A small app built natively on the new tab bar, glass surfaces, and map materials will look current in a category full of dated UI, and a flat editorial palette under glass stands apart from the gradient-heavy apps around it.

LLM extraction makes import-from-link cheap. Pulling title, date, venue, and host out of an Evite page, an Instagram caption, or a flyer image was a research project in 2022 and is a single API call in 2026. The signature feature is now a weekend of work rather than a quarter.

Facebook Events is fading for niche communities. Organic reach is throttled, event pages compete with ads and arguments, and organizers are actively looking for alternatives ([Radius](https://radius.to/facebook-events-alternative), [Teachfloor](https://www.teachfloor.com/blog/best-facebook-group-alternatives)). Nothing car specific has filled the gap with a good mobile map.

## 9. Product strategy and principles

Strategy: win one dense region first, then replicate. Density matters more than features. Ten meets within 20 miles that are always accurate beats a thousand stale listings nationwide.

Principles that apply to every screen:

- Useful with zero accounts. Every core surface works logged out.
- The event is the atom. Photos, comments, RSVPs, and check-ins all hang off an event, and recurring events are a first-class object.
- Attribute the source. Imported events show where they came from and link back.
- Come for the schedule, stay for the people. Social features follow discovery, never lead it (the Strava lesson: come for the tool, stay for the network, [Community Inc](https://community.inc/deep-dives/community-growth-strava)).
- Hosts are customers even when they do not pay. Their time is the scarce input.
- The brand is a tone, not a filter. Taste in the design, openness in the data.

## 10. Go-to-market: coastal Orange County first, Inland Empire second

Beachhead: the coastal strip from Newport Beach and Corona del Mar through Laguna Beach and Dana Point to San Clemente. Second ring: the Inland Empire (Fontana, Rancho Cucamonga, Ontario, Riverside, Redlands, Corona), which is where the builder lives and where the research inventory is deepest. Third ring, after launch: the rest of Orange County, LA, and San Diego.

The coastal strip is chosen because the beachhead persona is there, the small meets there are the least served by existing directories, and a dense, accurate schedule for a wealthy 15-mile strip is a credible story for hosts and venues elsewhere. The Inland Empire is the second ring because the builder can attend meets there every weekend, about 20 recurring meets are already captured, and the two regions together cover the two most common shapes of meet (small and quiet, big and institutional).

The approach is manual and personal, in the spirit of Strava's founders driving vans to races ([Community Inc](https://community.inc/deep-dives/community-growth-strava)).

| Motion | What | Target |
|---|---|---|
| Seed the schedule | Manually enter recurring meets before anyone sees the app, starting from the inventory in `docs/research/market-research.md` section 4 (about 11 Orange County entries, 6 of them coastal, and about 20 Inland Empire entries), then filling the coastal gap by hand: Porsche club calendars, Newport and Laguna coffee shop lots, group chats, and Sunday drives. Verify each against the organizer before listing. | Coastal OC: 25 verified by TestFlight, 40 by launch. Inland Empire: 25 by TestFlight, 45 by launch. Total 50 by TestFlight, 85 or more by launch; the rest of the 100 from the wider OC and LA inventory |
| Host partners | Recruit organizers who will claim their meet, keep it current, and tell attendees. Coastal first (small meets, single organizers, easy to reach), then the IE meets the builder already attends | 3 coastal and 2 IE by beta, 6 coastal and 4 IE by launch |
| Presence at meets | Attend two to three meets per month across both rings with QR cards and a "this weekend near you" landing page. Coastal meets get a Sunday morning; IE meets get a Saturday | Every weekend in the beta months |
| Club outreach | Ask the Porsche Club of America's Orange Coast Region and two or three marque clubs to list their open meets and link the app from their calendars | 2 clubs by launch |
| Instagram cross-posting | An app account that posts weekend roundups with host tags, plus story share cards in the brand's flat editorial style | Weekly roundup from beta onward |
| Coffee shop partnerships | Ask three to five car-friendly coffee shops (Newport, Corona del Mar, Laguna, plus one in Rancho Cucamonga) to display a QR card and be listed as venues | 3 by launch |
| Web SEO | Public event pages for every meet and city so "cars and coffee Newport Beach" and "cars and coffee Rancho Cucamonga" land on us | Indexed by launch |

The share loop is the engine. Every RSVP and every share card is a marketing touchpoint, the way each Partiful invite is ([NoGood](https://nogood.io/blog/partiful-marketing-strategy/)). Sharing to iMessage and Instagram must be one tap from event detail.

## 11. Success metrics, first six months

Measured from TestFlight beta (target February 2027) through six months after. "Launch region" means both rings.

| Metric | Month 1 | Month 3 | Month 6 |
|---|---|---|---|
| Meets listed (upcoming, within launch region) | 75 | 150 | 300 |
| Of which coastal Orange County | 30 | 50 | 80 |
| Claimed by a host | 5 | 15 | 40 |
| Weekly active browsers (logged out included) | 100 | 500 | 2,000 |
| RSVP rate (RSVPs per event detail view) | 3% | 5% | 8% |
| Host retention (hosts who update their meet in a 30 day window) | 60% | 60% | 70% |
| Import success rate (drafts published without manual date or venue fix) | 50% | 70% | 85% |
| Event freshness (share of upcoming meets with a source or host update in the last 30 days) | 70% | 80% | 90% |

Leading indicator to watch weekly: Friday night sessions. If people open the app on Friday evening, the schedule is doing its job.

## 12. Monetization

Explicitly deferred. Nothing is built or priced until the launch region has a dense, trusted schedule.

Future options, in rough order of fit: promoted placement for hosts, paid venue listings for coffee shops and dealerships, sponsor banners from local shops and detailers, ticketing for larger shows, and merch (the small-caps CURB SOCIAL CLUB lockup was designed with a cap and a tee in mind). Discovery will never be paywalled. Browsing, search, map, and event detail remain free to everyone, logged in or not.

## 13. Risks and mitigations

| Risk | Detail | Mitigation |
|---|---|---|
| Trademark and namespace | The descriptive-name problem is resolved by the rename: "Cars and Coffee" is treated by the USPTO as descriptive for event services (Cars and Coffee, Inc.'s 035/041 filings 86741281 and 86741282 were refused and abandoned; only a class 25 clothing registration, Reg. 4941522, is live; see [research/market-research.md](research/market-research.md) section 3). "Curb" is a crowded but workable namespace. Coexistence considerations, none of them blockers: Curb Mobility holds a live registration for CURB (Reg. 4800642) in classes 009, 036, and 039 for taxi reservation and payment software ([Justia](https://trademarks.justia.com/862/73/curb-86273899.html), [gocurb.com](https://www.gocurb.com/about)), which is the closest mark because it is class 009 software, though for transportation booking rather than event discovery; Curb Records (Curb Word Entertainment, Nashville) owns curb.com and the CURB name in music ([curb.com](https://www.curb.com/about/), [Wikipedia](https://en.wikipedia.org/wiki/Curb_Records)); Curb, Inc. sells a home energy monitor ([LinkedIn](https://www.linkedin.com/company/curb)); a bare CURB application in class 009 for a real-estate app by Summit Credit Union was abandoned in 2019 ([Justia](https://trademarks.justia.com/875/51/curb-87551084.html)); Curbed is a Vox Media real-estate publication ([Wikipedia](https://en.wikipedia.org/wiki/Curbed)). Many CURB-prefixed marks exist (CurbPay, Curbee, Curbo, Curbview), which cuts both ways: the field is crowded, so each mark is narrow | File for the composite CURB SOCIAL CLUB rather than bare CURB. Run a clearance search (TESS plus state and common-law) on CURB SOCIAL CLUB and on the lowercase "curb" wordmark before the App Store listing, then file an intent-to-use application in classes 009 (downloadable software) and 042 (SaaS, online event discovery). Keep the App Store title as Curb Social Club, never bare Curb. Confirm the domain, the App Store name, and the @curbsocialclub handles before the ITU filing (see gaps items 1 and 2). Budget for an attorney hour if the search surfaces a class 041 or 042 CURB mark for events |
| Scraping and ToS | Evite, Instagram, Facebook, and Eventbrite restrict automated access | Prefer user-initiated fetch of a single URL, use official APIs where they exist, fall back to user-pasted text or screenshot, always attribute and link back, honor takedown requests |
| Cold start | Empty map on day one kills trust | Seed 50 meets by hand before beta and 85 or more by launch, show "recurring" meets as always present, never ship an empty region to the store |
| Coastal seed gap | The research inventory has only about six coastal Orange County meets; the small ones the beachhead persona attends are not in any directory | Budget Sunday mornings in Phase 1 for on-the-ground seeding in Newport, Corona del Mar, and Laguna; recruit one club calendar owner as a source; accept that the coastal count will start below the IE count |
| Brand reads as exclusive | A coastal classic aesthetic can make a first-timer in a daily driver feel unwelcome, which breaks the core principle | Apply the two-way test (tasteful to the beachhead persona, welcoming to a first-timer) to every screen and copy string; no marque filters, no tiers; test onboarding copy with two or three non-enthusiasts before beta |
| Host trust | Hosts fear losing control of their meet or being scraped without consent | Claim flow with verification, host controls over visibility, easy delete, personal outreach before listing |
| Moderation | UGC photos and comments require reporting, blocking, and timely removal under App Store guideline 1.2 ([AcceptMyApp](https://acceptmy.app/guidelines/1-2-user-generated-content)) | Report and block in MVP, admin queue, 24 hour response commitment, image safety filter before social features ship |
| Solo dev bandwidth | 10 to 15 hours per week with a day job | Ruthless MVP cut, Claude Code for boilerplate and tests, one feature per week, defer Android and host dashboard |
| Platform dependence | Apple policy changes, Expo SDK churn | Keep native surface small, pin SDK versions, budget one upgrade sprint per quarter |
| Safety and liability | Meets can attract street takeovers and reckless driving | Terms prohibit illegal activity, hosts can mark meets private, reporting covers events not just content |

## 14. Year one budget (solo dev)

Estimates for a small production footprint. Prices are approximate as of September 2026 and should be re-checked at signup.

| Item | Monthly | Annual | Notes |
|---|---|---|---|
| Apple Developer Program | 8 | 99 | Required for TestFlight and App Store |
| Render or Fly.io (Rails + Postgres with PostGIS) | 25 to 45 | 300 to 540 | Starter web service plus managed Postgres; scale up only after launch |
| Vercel (web) | 0 to 20 | 0 to 240 | Hobby tier is fine until custom domain and team features are needed |
| Domain and DNS | 2 to 5 | 20 to 60 | Cloudflare registrar; `.club` and `.social` renewals cost more than `.com` |
| Cloudflare R2 or S3 (media) | 1 to 5 | 12 to 60 | Photos are small at this scale |
| Maps (Apple Maps via MapKit on iOS is free; Mapbox for web) | 0 to 10 | 0 to 120 | Mapbox free tier covers 50k web loads |
| LLM API (import extraction, OCR) | 5 to 20 | 60 to 240 | Hundreds of imports per month at a few cents each |
| Twilio (SMS, optional) | 0 to 10 | 0 to 120 | Only if phone auth or SMS reminders ship; defer |
| Sentry | 0 | 0 | Developer tier |
| Expo EAS | 0 to 19 | 0 to 228 | Free tier for early builds, Starter at $19 per month when priority builds matter ([Expo billing](https://docs.expo.dev/billing/plans/)) |
| Figma Professional | 16 | 192 | One Full seat, needed for variable modes (the three themes) and the MCP call volume |
| Fonts | 0 | 0 | Instrument Serif, Fraunces, Geist, and Inter are all open licenses |
| Email (Resend or Postmark) | 0 to 15 | 0 to 180 | Transactional only |
| Push (Expo push service) | 0 | 0 | Included |
| LLC filing and registered agent (California) | | 800 plus 70 to 150 | California LLC minimum franchise tax is $800 per year |
| Legal templates (terms, privacy) | | 0 to 300 | Generator plus a review if budget allows |
| Trademark clearance and filing | | 700 to 2,000 | Intent-to-use for CURB SOCIAL CLUB in classes 009 and 042 at $350 per class, plus an optional clearance search and attorney review |
| **Total** | **roughly 60 to 170** | **roughly 2,300 to 5,300** | Excluding the builder's time |

## 15. Legal

Entity: form a California LLC before launch to hold the app, the domain, and the trademark. Registered agent can be the owner.

Documents needed before TestFlight: Terms of Service (UGC license, prohibited conduct including illegal driving activity, host responsibilities), Privacy Policy (location use, account data, photo storage, third party processors), and community guidelines shown in the app. Apple requires the privacy policy link in App Store Connect and the app, in-app account deletion under guideline 5.1.1(v) ([Apple](https://developer.apple.com/news/?id=12m75xbj)), and Sign in with Apple whenever Google sign-in is offered under guideline 4.8 ([WorkOS](https://workos.com/blog/apple-app-store-authentication-sign-in-with-apple-2025)).

DMCA: register a designated agent with the Copyright Office and publish a takedown address, since users will upload photos and imported cover images.

Age: the app is not directed at children so COPPA does not apply, but set the age gate at 13+ in terms and rate the app accordingly in App Store Connect.

Location privacy: request location only when the map or feed needs it, offer approximate location as a first-class option, explain the purpose in the permission string, and fill the App Privacy label honestly (location, photos, user content, identifiers).

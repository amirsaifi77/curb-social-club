# Cars and Coffee: Project Proposal and Business Plan

Status: draft v0.1, 2026-09-05. Owner: Amir. Companion docs: `docs/app-overview.md`, `docs/development-plan.md`, `docs/market-research.md` (in progress by the research workstream).

## 1. Executive summary

Cars and Coffee is a discovery and social platform for local car meets, launching as an iOS app with a public web presence. Weekend coffee meets are the most common form of grassroots car gathering in Southern California, yet there is no single place to find out what is happening this Saturday within 20 miles. Meets are announced on Instagram, in Facebook groups, on Evite, in group chats, and on flyers taped to a shop window. Information goes stale, hosts post the same thing four times, and newcomers never find the good ones.

The product is a shared schedule for the local scene: a map and list of upcoming meets near you, browsable without an account, with an import-from-link flow so hosts can paste the Evite, Instagram post, or flyer they already made and have a structured, searchable event in seconds. It links back to the source instead of competing with it.

The plan is deliberately small. One builder at 10 to 15 hours per week, heavy use of Claude Code, a launch geography of the Inland Empire and neighboring SoCal counties, and no monetization until the schedule is dense enough that people trust it. The first six months are judged on whether the app becomes the thing local enthusiasts open on Friday night to decide where to go Saturday morning.

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

The app is integrated, not exclusive. Every event carries a link back to where it was originally announced, hosts keep posting wherever they already post, and attendees can browse without creating an account. The value we add is structure: a date, a place, a recurrence rule, a map pin, and a way to say "I'm going."

Three commitments shape every product decision.

1. Browse without an account. An account is only needed to post, RSVP, follow, or comment.
2. Import first, type second. Pasting a link or a flyer should be the default way to create an event.
3. Never paywall discovery. Finding a meet is free forever.

## 4. Target users and personas

| Persona | Who they are | Job to be done | What wins them |
|---|---|---|---|
| Browser (attendee) | Owns an enthusiast car or just likes them, goes to a few meets a year, often intimidated by the scene ([GarageApp guide](https://garageapp.com/blog/shows-events/cars-and-coffee-events-guide/)) | "What is on this Saturday near me, and is it still happening?" | Map, dates, photos from last time, no signup wall |
| Regular | Goes most weekends, follows several hosts, knows the circuit | Keep track of recurring meets, know when one is cancelled, see who else is going | Follow, reminders, RSVP counts, check-in |
| Host or organizer | Runs a weekly or monthly meet, often a small crew, promotes on Instagram | Reach people beyond followers without another chore | Import from link, claim the meet, one place that stays current |
| Venue | Coffee shop, dealership, tuning shop, brewery lot | Foot traffic on slow mornings, be known as car friendly | Venue page, recurring event association, later paid listing |
| Photographer | Shoots meets, posts on Instagram, wants credit and reach | Get photos in front of the people who were there | Photo posts tied to an event, attribution, profile link |

Secondary personas to keep in mind but not design for in MVP: car clubs (Porsche Club regions, Miata clubs), event promoters running ticketed shows, and parents bringing kids.

## 5. How meets are organized today

Meets in SoCal fall into three rough tiers. The big institutional ones (South OC Cars and Coffee in San Clemente, Supercar Sunday in Woodland Hills) have their own websites and Instagram presence and run on a fixed weekly cadence. Mid-size recurring meets are run by a shop, a dealership, or a small crew and are announced mostly on Instagram with an occasional flyer. Small ad hoc meets live in group chats and Instagram stories and appear a few days before.

Almost all happen Saturday or Sunday morning, typically between 6 and 10 am, and run two to four hours ([GarageApp guide](https://garageapp.com/blog/shows-events/cars-and-coffee-events-guide/)). Consistency of schedule and venue is what keeps a meet alive; the ones that die are irregular, lose their lot, or burn out a solo organizer ([Jake Worth on running a meetup for ten years](https://www.jakeworth.com/posts/how-i-organize-a-meetup/)). This matters for product: recurrence is not an edge case, it is the default shape of the data.

Details, counts, and named meets by city are in `docs/market-research.md`.

## 6. Competitive landscape

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

## 7. Why now

Three things line up in late 2026.

iOS 26 and Liquid Glass give a new app a design moment. A small app built natively on the new tab bar, glass surfaces, and map materials will look current in a category full of dated UI.

LLM extraction makes import-from-link cheap. Pulling title, date, venue, and host out of an Evite page, an Instagram caption, or a flyer image was a research project in 2022 and is a single API call in 2026. The signature feature is now a weekend of work rather than a quarter.

Facebook Events is fading for niche communities. Organic reach is throttled, event pages compete with ads and arguments, and organizers are actively looking for alternatives ([Radius](https://radius.to/facebook-events-alternative), [Teachfloor](https://www.teachfloor.com/blog/best-facebook-group-alternatives)). Nothing car specific has filled the gap with a good mobile map.

## 8. Product strategy and principles

Strategy: win one dense region first, then replicate. Density matters more than features. Ten meets within 20 miles that are always accurate beats a thousand stale listings nationwide.

Principles that apply to every screen:

- Useful with zero accounts. Every core surface works logged out.
- The event is the atom. Photos, comments, RSVPs, and check-ins all hang off an event, and recurring events are a first-class object.
- Attribute the source. Imported events show where they came from and link back.
- Come for the schedule, stay for the people. Social features follow discovery, never lead it (the Strava lesson: come for the tool, stay for the network, [Community Inc](https://community.inc/deep-dives/community-growth-strava)).
- Hosts are customers even when they do not pay. Their time is the scarce input.

## 9. Go-to-market: SoCal and the Inland Empire

Launch geography is Fontana, Rancho Cucamonga, Ontario, Riverside, and the corridor to Orange County and LA. The approach is manual and personal, in the spirit of Strava's founders driving vans to races ([Community Inc](https://community.inc/deep-dives/community-growth-strava)).

| Motion | What | Target |
|---|---|---|
| Seed the schedule | Manually enter 50 to 100 recurring meets from Instagram, sites, and local knowledge before anyone sees the app | 50 by TestFlight, 100 by launch |
| Host partners | Recruit 5 to 10 organizers who will claim their meet, keep it current, and tell attendees | 5 by beta, 10 by launch |
| Presence at meets | Attend two to three meets per month with QR flyers and a "see this weekend's meets" landing page | Every weekend in the beta months |
| Instagram cross-posting | An app account that reposts weekend roundups with host tags, plus share cards designed for stories | Weekly roundup from beta onward |
| Coffee shop partnerships | Ask three to five car-friendly coffee shops to display a QR card and be listed as venues | 3 by launch |
| Web SEO | Public event pages for every meet and city so "cars and coffee Rancho Cucamonga" lands on us | Indexed by launch |

The share loop is the engine. Every RSVP and every share card is a marketing touchpoint, the way each Partiful invite is ([NoGood](https://nogood.io/blog/partiful-marketing-strategy/)). Sharing to iMessage and Instagram must be one tap from event detail.

## 10. Success metrics, first six months

Measured from TestFlight beta (target February 2027) through six months after.

| Metric | Month 1 | Month 3 | Month 6 |
|---|---|---|---|
| Meets listed (upcoming, within launch region) | 75 | 150 | 300 |
| Claimed by a host | 5 | 15 | 40 |
| Weekly active browsers (logged out included) | 100 | 500 | 2,000 |
| RSVP rate (RSVPs per event detail view) | 3% | 5% | 8% |
| Host retention (hosts who update their meet in a 30 day window) | 60% | 60% | 70% |
| Import success rate (drafts published without manual date or venue fix) | 50% | 70% | 85% |
| Event freshness (share of upcoming meets with a source or host update in the last 30 days) | 70% | 80% | 90% |

Leading indicator to watch weekly: Friday night sessions. If people open the app on Friday evening, the schedule is doing its job.

## 11. Monetization

Explicitly deferred. Nothing is built or priced until the launch region has a dense, trusted schedule.

Future options, in rough order of fit: promoted placement for hosts, paid venue listings for coffee shops and dealerships, sponsor banners from local shops and detailers, ticketing for larger shows, and merch. Discovery will never be paywalled. Browsing, search, map, and event detail remain free to everyone, logged in or not.

## 12. Risks and mitigations

| Risk | Detail | Mitigation |
|---|---|---|
| Trademark on the name | "Cars and Coffee" is used generically nationwide. Cars and Coffee, Inc. holds one live US registration (Reg. 4941522, class 25 clothing); its event-services filings (86741281, 86741282) were refused and abandoned in 2022, and other applicants had to disclaim "cars & coffee," so the USPTO treats the phrase as descriptive (see [research/market-research.md](../research/market-research.md)). The name is hard to register or defend, and carsandcoffee.com is a pre-launch competitor on the exact-match domain | Treat "cars and coffee" as the category term, choose a distinctive app name before App Store submission, run a clearance search, and file an intent-to-use mark in classes 009 and 042. Decision needed by Phase 5 |
| Scraping and ToS | Evite, Instagram, Facebook, and Eventbrite restrict automated access | Prefer user-initiated fetch of a single URL, use official APIs where they exist, fall back to user-pasted text or screenshot, always attribute and link back, honor takedown requests |
| Cold start | Empty map on day one kills trust | Seed 50 to 100 meets by hand before beta, show "recurring" meets as always present, never ship an empty region to the store |
| Host trust | Hosts fear losing control of their meet or being scraped without consent | Claim flow with verification, host controls over visibility, easy delete, personal outreach before listing |
| Moderation | UGC photos and comments require reporting, blocking, and timely removal under App Store guideline 1.2 ([AcceptMyApp](https://acceptmy.app/guidelines/1-2-user-generated-content)) | Report and block in MVP, admin queue, 24 hour response commitment, image safety filter before social features ship |
| Solo dev bandwidth | 10 to 15 hours per week with a day job | Ruthless MVP cut, Claude Code for boilerplate and tests, one feature per week, defer Android and host dashboard |
| Platform dependence | Apple policy changes, Expo SDK churn | Keep native surface small, pin SDK versions, budget one upgrade sprint per quarter |
| Safety and liability | Meets can attract street takeovers and reckless driving | Terms prohibit illegal activity, hosts can mark meets private, reporting covers events not just content |

## 13. Year one budget (solo dev)

Estimates for a small production footprint. Prices are approximate as of September 2026 and should be re-checked at signup.

| Item | Monthly | Annual | Notes |
|---|---|---|---|
| Apple Developer Program | 8 | 99 | Required for TestFlight and App Store |
| Render or Fly.io (Rails + Postgres with PostGIS) | 25 to 45 | 300 to 540 | Starter web service plus managed Postgres; scale up only after launch |
| Vercel (web) | 0 to 20 | 0 to 240 | Hobby tier is fine until custom domain and team features are needed |
| Domain and DNS | 2 | 20 to 30 | Cloudflare registrar |
| Cloudflare R2 or S3 (media) | 1 to 5 | 12 to 60 | Photos are small at this scale |
| Maps (Apple Maps via MapKit on iOS is free; Mapbox for web) | 0 to 10 | 0 to 120 | Mapbox free tier covers 50k web loads |
| LLM API (import extraction, OCR) | 5 to 20 | 60 to 240 | Hundreds of imports per month at a few cents each |
| Twilio (SMS, optional) | 0 to 10 | 0 to 120 | Only if phone auth or SMS reminders ship; defer |
| Sentry | 0 | 0 | Developer tier |
| Expo EAS | 0 to 19 | 0 to 228 | Free tier for early builds, Starter at $19 per month when priority builds matter ([Expo billing](https://docs.expo.dev/billing/plans/)) |
| Email (Resend or Postmark) | 0 to 15 | 0 to 180 | Transactional only |
| Push (Expo push service) | 0 | 0 | Included |
| LLC filing and registered agent (California) | | 800 plus 70 to 150 | California LLC minimum franchise tax is $800 per year |
| Legal templates (terms, privacy) | | 0 to 300 | Generator plus a review if budget allows |
| Trademark filing | | 350 to 700 | One class, optional attorney |
| **Total** | **roughly 50 to 150** | **roughly 1,700 to 3,800** | Excluding the builder's time |

## 14. Legal

Entity: form a California LLC before launch to hold the app, the domain, and any trademark. Registered agent can be the owner.

Documents needed before TestFlight: Terms of Service (UGC license, prohibited conduct including illegal driving activity, host responsibilities), Privacy Policy (location use, account data, photo storage, third party processors), and community guidelines shown in the app. Apple requires the privacy policy link in App Store Connect and the app, in-app account deletion under guideline 5.1.1(v) ([Apple](https://developer.apple.com/news/?id=12m75xbj)), and Sign in with Apple whenever Google sign-in is offered under guideline 4.8 ([WorkOS](https://workos.com/blog/apple-app-store-authentication-sign-in-with-apple-2025)).

DMCA: register a designated agent with the Copyright Office and publish a takedown address, since users will upload photos and imported cover images.

Age: the app is not directed at children so COPPA does not apply, but set the age gate at 13+ in terms and rate the app accordingly in App Store Connect.

Location privacy: request location only when the map or feed needs it, offer approximate location as a first-class option, explain the purpose in the permission string, and fill the App Privacy label honestly (location, photos, user content, identifiers).

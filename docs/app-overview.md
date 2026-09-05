# Cars and Coffee: App Functional Overview

Status: draft v0.1, 2026-09-05. Scope: iOS app (primary) and public web. Companion docs: `docs/business-plan.md`, `docs/development-plan.md`.

## How to read this doc

Each surface has a purpose, the key UI, the data it shows, its states (empty, loading, error, offline), and a scope tag. Scope tags: **MVP** ships in the TestFlight beta and App Store launch; **Later** is post-launch. Shared conventions come first so they are not repeated per surface.

### Shared conventions

- Logged-out first. Every browse surface renders fully without an account. Actions that need an account (RSVP, post, follow, comment, create) show a bottom-sheet sign-in with Sign in with Apple and Google.
- Loading uses skeletons that match the final layout, never spinners on full screens.
- Errors are inline with a retry, and never block the navigation chrome.
- Offline shows the last cached feed and list with a "showing saved results" banner; map tiles come from MapKit's own cache. Writes queue locally and retry (RSVP, check-in) or fail visibly (create, comment).
- Liquid Glass tab bar with four tabs: Home (feed), Map, Create (center action), Me. Search is a glass search field pinned above Home and Map.
- Every event has a canonical web URL, and every deep link opens the same screen in app or web.

## Surfaces

### Onboarding

Purpose: get to a useful map in under 15 seconds without demanding anything.

Key UI: three swipeable cards (what it is, pick your area, optional interests), each with a Skip. Location permission is requested only on the "pick your area" card, with a text explanation before the system prompt. If denied or skipped, the user picks a home area by typing a city or dropping a pin.

Data: home area (city or coordinate plus radius), optional vehicle interests (JDM, Euro, American muscle, exotics, trucks and offroad, classic, EV, general), notification opt-in later.

States: no empty state. Loading only on area search. Error on geocode failure offers the pin option. Offline lets the user continue with a default region (Inland Empire) and re-prompts later.

Scope: MVP. Interests are stored but only used for feed ranking in Later.

### Feed (Home)

Purpose: answer "what is happening this weekend near me" the moment the app opens.

Key UI: a date-grouped list starting with "This weekend," then "Next week," then "Later." Each card shows cover image, title, day and time, venue and distance, host avatar, recurring badge, going count, and a source pill (Instagram, Evite, Host) when imported. A thin activity strip above the list (Later) shows photos and posts from followed hosts and people.

Data: events within the home radius sorted by start time, with recurring events expanded into their next occurrence.

States: empty shows "No meets listed near you yet" with a button to widen radius and a button to add one. Loading shows five skeleton cards. Error shows inline retry. Offline shows cached feed with banner.

Scope: MVP for the event list; activity strip and personalized ranking are Later.

### Map

Purpose: spatial browsing with proximity search.

Key UI: full-bleed MapKit map with Liquid Glass filter chips floating at top (This weekend, Distance, Theme, Recurring only) and a draggable bottom sheet listing the events in view. Pins cluster at low zoom. Tapping a pin highlights its card in the sheet; tapping a card recenters. A "search this area" pill appears after panning.

Data: PostGIS radius or bounding-box query returning events in the visible region with the active filters, capped at 200 with clustering server-side beyond that.

States: empty shows a sheet message "Nothing here this weekend" with a "show all upcoming" toggle. Loading dims pins and shows a small progress indicator in the sheet. Error keeps the map and shows retry in the sheet. Offline shows last results and disables "search this area."

Scope: MVP. Heatmap of past meets and photo pins are Later.

### List view

Purpose: the same query as the map, readable as a list sorted by date or distance.

Key UI: a segmented toggle on the Map sheet expands it to full height; sort control (Soonest, Nearest). Same cards as Feed.

Data: identical query to Map. Scope: MVP.

### Search

Purpose: find a specific meet, host, venue, or city.

Key UI: glass search field with recent searches and suggestions grouped by type (Events, Hosts, Venues, Places). Typing a city moves the map.

Data: Postgres full-text search over event title, description, host name, venue name; place search via MapKit geocoding.

States: empty query shows recents and trending hosts. No results shows "Try a wider area" and a link to create. Offline searches cached results only.

Scope: MVP for events and places; hosts and venues in MVP if cheap, otherwise Later.

### Event detail

Purpose: everything needed to decide to go and to get there.

Key UI: cover image with glass overlay title, then blocks in this order: when (with next occurrences for recurring meets and an "add to calendar" action), where (map snippet, address, directions button, parking note), host (avatar, follow button, claimed badge), going (avatars and count, "I'm going" button), about (description), source (a card that says "Originally posted on Instagram by @host" with a link out), photos (grid from past occurrences, Later), comments (Later). Share button in the nav bar.

Data: event, occurrence, venue, host, RSVP summary, source attribution, photos and comments when enabled.

States: loading shows skeleton with the cover. Error on a deleted or private event shows a friendly "This meet is no longer listed" page. Offline shows cached detail and disables RSVP with "will send when online" if already queued. Cancelled occurrences show a red banner at the top and are dimmed in lists.

Scope: MVP without photos and comments; those arrive in Phase 4.

### Create event: manual form

Purpose: let a host or any signed-in user list a meet in under two minutes.

Key UI: a single scrolling form with sections: title, date and time (start, optional end), recurrence (none, weekly, biweekly, monthly on the nth weekday, custom), location (place search, map pin, parking note), theme tags, description, cover image, source link (optional), visibility (public, unlisted). A preview card updates live at the top. Publish button in the nav bar.

Data: creates an Event with an optional RecurrenceRule and a first Occurrence; venue is created or matched.

States: validation errors inline. Save draft locally on every change so a backgrounded app loses nothing. Offline shows "You are offline. Your draft is saved" and disables Publish.

Scope: MVP.

### Create event: import from link

Purpose: the signature feature. Turn a link or flyer the host already has into a structured event with as little typing as possible.

Step by step, the paste-link experience:

1. Entry. The Create tab opens with a large glass input: "Paste a link or drop a flyer." The clipboard is checked on open (with iOS paste permission) and, if it holds a URL, the input pre-fills with a "Use this link?" chip. A camera button captures a physical flyer; a photo button picks a screenshot.
2. Fetch. The app POSTs the URL or image to the API, which enqueues an import job. The screen shows the source favicon and a progress line: "Reading the Evite page," then "Finding the date and place," then "Building your draft." Typical time three to eight seconds. If the source blocks fetching, the app offers "Paste the text instead" with a text box, and the same pipeline runs on pasted text.
3. Draft preview. The result renders as an event card exactly as it will appear in the feed, above a field list. Each field (title, start, end, recurrence, venue name, address, host, description, cover image) shows a confidence indicator: a filled dot for high, half for medium, outline for low, and a "not found" label when absent. Fields with medium or low confidence are expanded by default with the extracted snippet the model used shown in small text, so the host can see why.
4. Edit. Tapping any field opens the same control the manual form uses. Address fields run through geocoding and show the pin; if geocoding fails the map asks for a manual pin. Date fields show the parsed value alongside the original text ("Sat Oct 4, 7am" from "this saturday 7-10"). Recurrence detection ("every Saturday") is offered as a suggestion, never auto-applied.
5. Attribution. A locked Source block shows the canonical source URL, the platform, and the original author handle when known. It cannot be removed on an imported event, only corrected. The event detail will display "Originally posted on Evite" with a link out. Cover images imported from the source are stored with the source URL recorded, and hosts are asked to confirm they have the right to use the image or to pick a different one.
6. Publish. Publish is disabled until title, start, and location have at least medium confidence or have been edited. On publish, the event is created with `source_type`, `source_url`, `import_job_id`, and per-field confidence stored for later quality analysis. The host sees a success sheet with Share and "Claim this meet as host" if they are not already the host.
7. Duplicate check. Before publish, the API checks for existing events with the same source URL or a near match on venue and start time and offers "This meet is already listed. Open it instead?" with a link, or "List anyway."

Data: ImportJob (status, source type, raw fetch, extracted JSON, per-field confidence, errors), resulting Event.

States: empty input shows examples of supported sources. Loading is the staged progress described above. Error states: unreachable URL (offer paste text), unsupported source (fall back to generic Open Graph plus LLM), nothing extracted (open the manual form pre-filled with whatever was found), rate limited (message and retry time). Offline disables import and says so.

Scope: MVP includes Evite and generic Open Graph plus LLM extraction from page text. Eventbrite, Meetup, Partiful, Instagram, and flyer OCR are Phase 3 extensions in that order. Facebook is Later and may remain paste-text only.

### Recurring meets

Purpose: model the default shape of a car meet, "every Saturday 7 to 10 am," as one object.

Key UI: recurring badge on cards, next three occurrences on the event detail, a per-occurrence "cancelled this week" toggle for hosts, and an exceptions list in the host edit screen (skip a date, change a time once). Feed and map show only the next occurrence unless the user expands.

Data: RecurrenceRule (RFC 5545 style rule stored as fields, not raw RRULE string, for query simplicity), Occurrence rows materialized 90 days ahead by a nightly job, per-occurrence overrides.

States: an occurrence in the past collapses into the event's history. A recurring event with no host update in 60 days gets a "verify this is still happening" prompt to followers and a "last confirmed" date on the detail.

Scope: MVP.

### RSVP and check-in

Purpose: signal intent, show social proof, and later build a record of who was actually there.

Key UI: "I'm going" toggle on cards and detail, going count with avatars, an "Interested" secondary state. Check-in appears on the day of the event when the user is within 500 meters, as a one-tap button on the detail and as a push suggestion (Later). Checked-in users are shown separately from RSVPs on the detail.

Data: Rsvp (user, occurrence, status), Checkin (user, occurrence, timestamp, coarse location flag). Precise location is never stored, only the fact of proximity.

States: logged-out tap opens sign-in sheet, then completes the RSVP. Offline queues the RSVP. Cancelled occurrences show RSVPs as historical and disable the button.

Scope: RSVP is MVP. Check-in is Phase 4.

### Photos and posts

Purpose: make meets feel alive and give photographers and regulars a reason to return.

Key UI: photo grid on event detail, a Post sheet from the detail (pick up to 10 photos, optional caption, tag the event automatically), and an activity strip on Home from followed accounts. Photos show the poster's handle and link to their profile.

Data: Post (user, occurrence, caption), Photo (ActiveStorage blob, dimensions, blurhash placeholder), moderation status.

States: empty grid on an upcoming event says "Photos from this meet will show up here." Upload progress per photo with retry. Rejected by safety filter shows a neutral message and a link to guidelines.

Scope: Phase 4.

### Comments

Purpose: lightweight coordination ("is it still on with the rain?") without a group chat.

Key UI: flat comment list on the event detail (no threads in v1), host replies are badged, report and block from a long-press menu.

Data: Comment (user, event or occurrence, body, moderation status).

States: empty says "Ask the host a question." Loading skeleton lines. Offline shows cached comments and disables composer.

Scope: Phase 4.

### Profiles and Garage

Purpose: identity for people and a small, fun reason to complete a profile.

Key UI: avatar, handle, home area (city only), bio, garage (cards for each car with year, make, model, optional photo and nickname), tabs for Going, Posts, Following. Garage appears on RSVP avatars as a small badge (Later).

Data: User, GarageCar (year, make, model, trim, color, photo, nickname).

States: empty garage shows "Add your first car." Private profile hides going and posts from non-followers (Later).

Scope: Profile and Garage basics are MVP because they are cheap and increase signup completion. Privacy controls beyond public and private are Later.

### Hosts, organizer pages, and claiming a meet

Purpose: give organizers a home and make claimed meets trustworthy.

Key UI: host page with banner, name, links (Instagram, website), upcoming and past meets, followers count, "Claimed" badge. On any unclaimed event detail, "Are you the host? Claim this meet." Claim flow: sign in, state the relationship, verify by one of three methods (a code posted to the source Instagram or site, an email at a domain matching the source, or manual review by the app owner). Claimed events show the host badge and unlock host controls: edit, cancel an occurrence, pin a comment, see RSVP list.

Data: Host (organization or person, verified flag, links), HostMembership (user, host, role), ClaimRequest (status, evidence).

States: pending claim shows "Claim under review" to the requester only. Rejected claims can be resubmitted once. Contested claims (two requesters) go to manual review.

Scope: Host pages and claim with manual review are MVP. Automated verification is Later.

### Follow

Purpose: personalize the feed and power notifications.

Key UI: Follow button on host pages and profiles, Following tab on Me, follower counts on host pages only (not on people, to keep it low pressure).

Data: Follow (follower, followable polymorphic).

Scope: Follow hosts is MVP (needed for "host you follow posted" notifications). Follow people is Phase 4.

### Notifications

Purpose: bring people back at the right moment without being noisy.

Key UI: settings screen with toggles per type. Types: new meet near you (weekly digest by default, not per event), host you follow posted or changed a meet, reminder the evening before an RSVP, meet cancelled, comment reply, claim approved.

Data: Device (Expo push token), NotificationPreference, Notification (in-app inbox, Later).

States: permission is requested only after the first RSVP or follow, with an explanation. Denied permission shows a settings deep link in the notification settings screen.

Scope: RSVP reminder and cancellation are MVP. Follow-based and nearby digest are Phase 4.

### Share and deep links

Purpose: the growth loop. Every event should be one tap away from iMessage and Instagram stories.

Key UI: Share button on event detail opens the system share sheet with a rich link preview (title, date, venue, cover). A "Share to Story" option renders a 9:16 card image with the cover, title, date, venue, and a QR code to the web page. Universal Links (`carsandcoffee.app/e/slug`) open the app when installed and the web page otherwise.

Data: canonical slug per event, Open Graph tags on the web page, a rendered card image cached in R2.

States: sharing an unlisted event includes a token in the URL. Sharing a cancelled occurrence shares the event, not the cancelled date.

Scope: MVP. Story card rendering can be server-side to keep the app simple.

### Reporting and moderation

Purpose: satisfy App Store guideline 1.2 and keep the community safe.

Key UI: Report from long-press or the overflow menu on events, comments, photos, profiles, and hosts, with reasons (spam, wrong info, not a real meet, illegal activity, harassment, inappropriate content, copyright). Block user from profiles and comments. Reported content is hidden for the reporter immediately. An admin web screen (simple Rails views, owner only) lists reports, allows hide, delete, ban, and records actions.

Data: Report (reporter, reportable, reason, status), Block (blocker, blocked), ModerationAction.

Policy: respond to reports within 24 hours during beta, image safety filtering on upload before photos ship, published community guidelines and terms link inside the app. Apple expects filtering, reporting, blocking, and published contact for UGC apps ([AcceptMyApp on guideline 1.2](https://acceptmy.app/guidelines/1-2-user-generated-content)).

Scope: Report and block on events and profiles are MVP. Comment and photo moderation ship with those features. Automated image filtering is Phase 4.

### Settings and privacy

Purpose: control, transparency, and App Store compliance.

Key UI: account (email, linked sign-in methods, delete account), location (precise or approximate, home area), notifications, privacy (profile visibility, hide from going lists), blocked users, legal links (terms, privacy, guidelines), about, sign out.

Requirements: in-app account deletion is mandatory ([Apple, guideline 5.1.1(v)](https://developer.apple.com/news/?id=12m75xbj)). Sign in with Apple must be offered because Google sign-in is offered ([WorkOS on guideline 4.8](https://workos.com/blog/apple-app-store-authentication-sign-in-with-apple-2025)). Location purpose strings must explain use, and the App Privacy label must list location, user content, identifiers, and contact info.

Scope: MVP.

### Web site

Purpose: SEO, link previews, and a no-install path. Later, a host dashboard.

Key UI (MVP): home page with a region picker and this weekend's meets, city pages (`/socal/rancho-cucamonga`), event pages with full detail and RSVP (opens app or sign-in), host pages, and an "Open in app" banner. Server-rendered for crawlers and link unfurls.

Key UI (Later): host dashboard for editing, occurrences, RSVP export, and analytics; admin moderation screens if not kept in Rails.

Framework: React Router v7 in framework mode with SSR on Vercel, per ADR 0005 (status Proposed). Event, city, and host pages need server rendering and Open Graph tags for SEO and link previews. Next.js is the alternative if App Router conventions or ISR caching turn out to matter more than a lighter framework; the choice does not affect the API or mobile app. The host dashboard can be a client-rendered section of the same app later.

States: event not found renders a 404 with nearby meets. Deleted or private events render a neutral "no longer listed" page with a 410.

Scope: Public pages are MVP. Dashboard is Later.

## User journeys

| Journey | Persona | Steps | Account needed |
|---|---|---|---|
| Find a meet this Saturday | Browser | Open app, skip onboarding, allow approximate location, scroll This weekend, open detail, tap Directions | No |
| Decide to go and tell a friend | Regular | Open detail, tap I'm going, sign in with Apple, share to iMessage | Yes at RSVP |
| List a meet from an Evite | Host | Create tab, paste link, review draft, fix venue pin, publish, share to Instagram story | Yes |
| Claim an existing listing | Host | Find own meet, tap Claim, sign in, submit Instagram handle, receive approval, edit details | Yes |
| Cancel this week because of rain | Host | Open event, host controls, cancel this occurrence with a note, RSVPs get a push | Yes |
| Post photos after a meet | Photographer | Open the past occurrence, tap Post, pick photos, publish, photos appear on event and profile | Yes |
| Check who is going | Regular | Open detail, see going avatars and garage badges, follow a host | Follow needs account |
| Land from Google | Browser | Search "cars and coffee Riverside," open web event page, tap Open in app or just read | No |
| Report a fake listing | Any | Long-press event, Report, choose "not a real meet," submit | No for MVP (rate limited) |

## MVP feature cut

| Must (TestFlight beta and launch) | Should (launch if time allows, else month one) | Later |
|---|---|---|
| Feed, Map with clustering and filters, List, Search (events and places) | Search for hosts and venues | Personalized feed ranking, activity strip |
| Event detail with source attribution and directions | Add to calendar | Photos, comments, check-in |
| Manual create with recurrence and exceptions | Duplicate detection on manual create | Follow people, garage badges on RSVPs |
| Import from link: Evite, generic OG plus LLM, paste text fallback | Eventbrite and Meetup importers | Partiful, Instagram, flyer OCR, Facebook |
| Sign in with Apple and Google, account deletion | Profile privacy toggle | Automated host verification |
| Profiles with garage basics, host pages, claim with manual review | Host controls: cancel occurrence with push | Host dashboard on web, analytics |
| RSVP with reminder push, cancellation push | Story share card | Nearby digest, follow notifications, in-app inbox |
| Share with Universal Links and OG previews | | Venue pages and partnerships |
| Report and block, admin moderation queue | | Image safety filtering, trust scores |
| Settings with location and notification controls | | Android |
| Web: home, city pages, event pages, host pages | | Monetization surfaces |
| Seeded schedule of 50 to 100 SoCal meets | | |

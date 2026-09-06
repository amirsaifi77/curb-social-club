# Curb Social Club Brand Guide

Version 2.1, 2026-09-05. Supersedes the Cars and Coffee amber brand (v0.1). Companion files: `tokens.json`, `logos/`, `icons/`, `brand-sheet.png`, `palette-*.png`, `social-card-1200x630.png`. Written for a solo builder shipping iOS first under iOS 26 Liquid Glass, then web, with everything mirrored in Figma as variable modes.

## 1. Brand essence

Quiet coastal classic luxury. A marine-layer morning in Newport Beach: overcast sky, wet asphalt, coffee in a paper cup, forty cars in a lot behind a bakery by eight. Wealthy but not flashy. The people are young to middle-aged owners of classic Porsches and the cars parked next to them are a Volvo wagon and two Miatas, and nobody minds.

The brand is a tone, not a velvet rope. The product principle still stands: not exclusive, meet people where they are, every meet listed, every car welcome. The aesthetic is coastal classic. The door is open.

| We are | We are not |
| --- | --- |
| Understated. One accent per screen, thin rules, room to breathe. | Loud. Gradients, glows, badges, confetti. |
| Marine layer. Cool greys, fog white, early light. | Sunshine. Saturated sky blue, golden hour filters. |
| Editorial. Serif headlines, left-aligned hierarchy, captions like a magazine. | App store. Centered hero text, rounded pill everything, emoji in copy. |
| Specific. Place, time, distance, host, count. | Generic. "Amazing events near you." |
| Open. Every meet, every car, browsing without an account. | Gatekept. "Members only", "exclusive", "elite". |

Three words to keep every screen honest: **quiet, specific, open.**

## 2. Naming system

| Form | Written as | Where it appears |
| --- | --- | --- |
| Legal and formal | Curb Social Club | Legal pages, App Store developer name, invoices, press boilerplate, the small-caps lockup, footers. |
| Conversational and marketing | Curb Social | Landing page prose, social bios, emails, push notification sender name, the way a person says it. |
| App and product | curb | App icon, home screen name, wordmark, in-app references, URL scheme (`curb://`), Expo slug, handles (`@curb.social`). Always lowercase, even at the start of a sentence. |

Rules:

1. "curb" is never capitalized in product copy. "Open curb", not "Open Curb". If a sentence cannot start with a lowercase word comfortably, rewrite the sentence.
2. Never "Curb Social Club" inside the app except on the About and Legal screens.
3. Never abbreviate to "CSC".
4. The category term is written **cars and coffee**, lowercase, no ampersand, no capitals: "find cars and coffee meets near you". Capitalize only inside the proper name of a specific real-world event that uses it (South OC Cars and Coffee). The product is never called Cars and Coffee.
5. Event vocabulary: "meet", "host", "going", "series" (for recurring). Not "event ticket", "attendee", "activation", "RSVP" as a noun.

## 3. Voice and tone

Voice: someone who has been going to the same lot on Saturdays for ten years and will tell you where to park. Calm, specific, slightly dry. Short sentences. Facts before feelings. Never hype, never "bro", never exclamation points. Humor is allowed if it is quiet.

| Do | Don't |
| --- | --- |
| Name the place, the time, the distance. | "Epic", "insane", "exclusive", "elite", "curated", "premium". |
| "Bring whatever you drive." | Rank cars or people. |
| Credit the host and link the source. | Pretend the meet is ours. |
| Sentence case everywhere, including buttons. | Title Case Buttons, ALL CAPS HEADLINES (the plate style is the one exception). |
| Numbers as numerals: 42 going, 4.2 mi, 7:30 am. | "Forty-two people are attending." |
| Say what happened and what to do next. | Apologize at length. |

### Example copy

**Empty states**

| Context | Copy |
| --- | --- |
| Feed, no location | **Nothing nearby yet.** Turn on location or pick a city to see this weekend's meets. |
| Map, zoomed to nowhere | **No meets here.** Zoom out, or add the one you know about. |
| Following, empty | **You're not following anyone.** Follow a host and their meets show up here first. |
| Garage, empty | **Your garage is empty.** Add what you drive. Daily drivers count. |
| Past meet, no photos | **No photos from this one yet.** Were you there? |
| Search, no results | **Nothing for "{query}".** Try a city, a host, or a day. |

**Push notifications** (max 90 characters, lead with time or distance, name the host, no emoji)

| Trigger | Copy |
| --- | --- |
| New meet nearby | 3.1 mi away: Back Bay Coffee, Sat 7:30 am. Hosted by Back Bay Air-Cooled. |
| Host posted | Back Bay Air-Cooled posted a meet for Sat, Sep 12. |
| Reminder | Tomorrow 7:30 am: Back Bay Coffee. 42 going. Directions? |
| Photos | 18 new photos from this morning at Back Bay. |
| Series moved | Back Bay Coffee moved to 8 am this Saturday. Marine layer, apparently. |

**Calls to action**

| Slot | Copy |
| --- | --- |
| Primary, event | I'm going |
| Primary, after going | Going |
| Secondary, event | Share |
| Tertiary, event | Directions |
| Create | Add a meet |
| Import | Paste a link |
| Import success | Looks right? Fix anything we got wrong, then post. |
| Import failure | Couldn't read that link. Try a public Evite, Eventbrite, or Meetup link, or fill it in by hand. |
| Sign-in prompt | Sign in to mark yourself going, post photos, and follow hosts. Browsing is always free. |
| Follow | Follow |
| Recurring label | Every Saturday, 7:30 to 10 am |

**Event description** (as a host would write it, and as we would edit it)

> Back Bay Coffee, Saturday. Lot behind the bakery on Bayside, 7:30 to 10. Coffee is inside, parking is wherever there is room. Air-cooled and water-cooled both fine. Wagons welcome. If the marine layer holds, bring a jacket. It usually holds.

**Host welcome** (first-run for a new host)

> Thanks for hosting. Your meet is listed and people nearby can see it now. A few things that help: post the exact lot, not just the street. Say when the coffee runs out. Add a photo from last time, overcast is fine. If the meet moves or cancels, change it here and everyone who is going gets one message, from you, with your name on it.

## 4. Color

Three themes, each flat, each with a light and a dark scheme. Marine Layer is the default. Every theme shares the same role names so a component is written once and themed by tokens. Flat means: solid fills, 1px rules, no gradients, no glows, no glossy highlights, no shadows heavier than a hairline.

Accent rule: one accent per screen. In light schemes the accent is dark and carries light ink; in dark schemes the accent is lifted and carries dark ink. This keeps every accent usable both as a fill and as text.

Each accent has a name. Marine Layer's is **Lido Blue**, a deep harbor navy (`#0E2A47` light, `#9DC1E4` lifted for dark), named for Lido Isle in Newport Beach. Harbor's is old brass and Olive and Ivory's is burnt sienna. The name is for people; code and Figma use the role `accent`.

### Marine Layer (`marine-layer`)

Fog white, overcast grey, wet-asphalt charcoal, muted slate blue, one Lido Blue accent.

| Role | Light | Dark | Use |
| --- | --- | --- | --- |
| bg | #F3F4F4 | #15181A | Page background |
| surface | #F9FAFA | #1E2225 | Cards, list rows, flat content surface |
| surfaceRaised | #FFFFFF | #272C30 | Sheets, menus, popovers (raised by tone, not shadow) |
| border | #D5D9DB | #363C41 | 1px hairline rules and dividers |
| textPrimary | #23272A | #EDEFF0 | Body, titles, icons |
| textSecondary | #5C6469 | #A2A9AE | Metadata, captions, placeholders |
| accent | #0E2A47 | #9DC1E4 | The one action per screen, selected states, today pin |
| accentInk | #F3F4F4 | #15181A | Text and icons on accent fills |
| link | #3C5A70 | #8FB0C6 | Inline links, upcoming pin |
| success | #2E6B51 | #7FBB9C | Confirmed, live now |
| warning | #805518 | #D2A868 | Check this, medium confidence |
| error | #A33A31 | #DE8F86 | Failed, low confidence |
| pinNow | #2E6B51 | #7FBB9C | Map pin: happening right now |
| pinToday | #0E2A47 | #9DC1E4 | Map pin: later today |
| pinUpcoming | #48677D | #8FB0C6 | Map pin: this week or later |
| pinRecurring | #5E5B7A | #A9A4C9 | Map pin: weekly or monthly series |
| pinPast | #7E8588 | #6C7478 | Map pin: ended, photos only |
| pinCluster | #5C6469 | #EDEFF0 | Map cluster count badge |
| pinLabel | #FFFFFF | #15181A | Glyph or count on any pin |
| glassTint | #F3F4F4A6 | #15181AA6 | Tint applied to Liquid Glass nav layer (hex8, alpha) |
| scrim | #23272A40 | #00000059 | Overlay under text on photos (hex8, alpha) |

### Harbor (`harbor`)

Deep navy, bone white, warm sand, an old-brass accent.

| Role | Light | Dark | Use |
| --- | --- | --- | --- |
| bg | #F4F0E7 | #0F1A2B | Page background |
| surface | #FAF7F0 | #172438 | Cards, list rows, flat content surface |
| surfaceRaised | #FFFDF8 | #203047 | Sheets, menus, popovers (raised by tone, not shadow) |
| border | #DDD3C1 | #2F3F57 | 1px hairline rules and dividers |
| textPrimary | #16223A | #F1ECE1 | Body, titles, icons |
| textSecondary | #5A6272 | #A7AEBC | Metadata, captions, placeholders |
| accent | #7A5A1E | #CBA55B | The one action per screen, selected states, today pin |
| accentInk | #F4F0E7 | #0F1A2B | Text and icons on accent fills |
| link | #2F4E7A | #8FB4E0 | Inline links, upcoming pin |
| success | #2F6A4E | #7FBB9C | Confirmed, live now |
| warning | #875416 | #D8AC5E | Check this, medium confidence |
| error | #A63A30 | #E08E84 | Failed, low confidence |
| pinNow | #2F6A4E | #7FBB9C | Map pin: happening right now |
| pinToday | #7A5A1E | #CBA55B | Map pin: later today |
| pinUpcoming | #2F4E7A | #8FB4E0 | Map pin: this week or later |
| pinRecurring | #5E5679 | #ABA4CD | Map pin: weekly or monthly series |
| pinPast | #867F72 | #6B7382 | Map pin: ended, photos only |
| pinCluster | #16223A | #F1ECE1 | Map cluster count badge |
| pinLabel | #FFFFFF | #0F1A2B | Glyph or count on any pin |
| glassTint | #F4F0E7A6 | #0F1A2BA6 | Tint applied to Liquid Glass nav layer (hex8, alpha) |
| scrim | #16223A40 | #00000059 | Overlay under text on photos (hex8, alpha) |

### Olive and Ivory (`olive-ivory`)

Sage-olive, ivory, stone grey, a burnt-sienna accent.

| Role | Light | Dark | Use |
| --- | --- | --- | --- |
| bg | #F3F0E5 | #191C15 | Page background |
| surface | #F9F7EE | #22261D | Cards, list rows, flat content surface |
| surfaceRaised | #FFFEF7 | #2C3127 | Sheets, menus, popovers (raised by tone, not shadow) |
| border | #D8D4C6 | #3B4134 | 1px hairline rules and dividers |
| textPrimary | #22261E | #EFECE1 | Body, titles, icons |
| textSecondary | #5C6156 | #A8AB9E | Metadata, captions, placeholders |
| accent | #8A3D1F | #D9946E | The one action per screen, selected states, today pin |
| accentInk | #F3F0E5 | #191C15 | Text and icons on accent fills |
| link | #4B5E3E | #A9B98F | Inline links, upcoming pin |
| success | #356A48 | #84BB99 | Confirmed, live now |
| warning | #84561A | #D4A961 | Check this, medium confidence |
| error | #A3382E | #DE8F86 | Failed, low confidence |
| pinNow | #356A48 | #84BB99 | Map pin: happening right now |
| pinToday | #8A3D1F | #D9946E | Map pin: later today |
| pinUpcoming | #4B5E3E | #A9B98F | Map pin: this week or later |
| pinRecurring | #5F5A78 | #ADA6CC | Map pin: weekly or monthly series |
| pinPast | #84837A | #6E7268 | Map pin: ended, photos only |
| pinCluster | #22261E | #EFECE1 | Map cluster count badge |
| pinLabel | #FFFFFF | #191C15 | Glyph or count on any pin |
| glassTint | #F3F0E5A6 | #191C15A6 | Tint applied to Liquid Glass nav layer (hex8, alpha) |
| scrim | #22261E40 | #00000059 | Overlay under text on photos (hex8, alpha) |

### Map pins

Pins are a filled circle with a 2px ring in `surfaceRaised` and a small glyph in `pinLabel`. No teardrops. State is carried by color only, so the six pin colors are chosen to separate in value as well as hue. In Marine Layer light the cluster badge is `textSecondary` (`#5C6469`) rather than `textPrimary`, so the grey cluster reads apart from the Lido Blue today pin; the other themes keep `textPrimary` for the cluster.

| State | Meaning | Glyph |
| --- | --- | --- |
| now | Happening right now | `car.fill` |
| today | Starts later today | `car.fill` |
| upcoming | This week or later | `car.fill` |
| recurring | Weekly or monthly series | `repeat` |
| past | Ended, photos only | `photo` |
| cluster | Count badge | count in the plate style |
| selected | Any of the above, 1.2x scale, ring becomes `textPrimary` | |

### Glass tint and scrim

`glassTint` is the tint applied to the Liquid Glass navigation layer (hex8, 65% alpha of the scheme's `bg`). `scrim` is an overlay placed under any text that sits on a photo. Text on glass cannot be pre-verified because the backdrop moves, so the rule is: text on glass uses `textPrimary` with the system vibrancy style, and any glass that carries text over a photo sits on `scrim`.

## 5. Contrast (WCAG 2.1)

Computed from the relative luminance formula by `work/palette.py`. Body text needs 4.5:1, large text and UI components need 3:1. Every text-on-surface pair in every theme and scheme is at or above 5.3:1. Every accent-ink-on-accent pair is at or above 5.5:1 (Marine Layer's Lido Blue measures 13.2:1 light and 9.5:1 dark). Pin labels are UI components (3:1) and pins against the page background are UI components (3:1); the weakest is `pinPast` at 3.3:1, which was darkened from a first draft that measured 2.9.

#### Marine Layer, light

| Pair | Foreground | Background | Ratio | Needs | Result |
| --- | --- | --- | --- | --- | --- |
| Text primary on bg | #23272A | #F3F4F4 | 13.66 | 4.5 | AA |
| Text secondary on bg | #5C6469 | #F3F4F4 | 5.47 | 4.5 | AA |
| Link on bg | #3C5A70 | #F3F4F4 | 6.60 | 4.5 | AA |
| Accent as text on bg | #0E2A47 | #F3F4F4 | 13.23 | 4.5 | AA |
| Success text on bg | #2E6B51 | #F3F4F4 | 5.71 | 4.5 | AA |
| Warning text on bg | #805518 | #F3F4F4 | 5.90 | 4.5 | AA |
| Error text on bg | #A33A31 | #F3F4F4 | 5.94 | 4.5 | AA |
| Text primary on surface | #23272A | #F9FAFA | 14.40 | 4.5 | AA |
| Text secondary on surface | #5C6469 | #F9FAFA | 5.77 | 4.5 | AA |
| Link on surface | #3C5A70 | #F9FAFA | 6.95 | 4.5 | AA |
| Accent as text on surface | #0E2A47 | #F9FAFA | 13.94 | 4.5 | AA |
| Success text on surface | #2E6B51 | #F9FAFA | 6.02 | 4.5 | AA |
| Warning text on surface | #805518 | #F9FAFA | 6.22 | 4.5 | AA |
| Error text on surface | #A33A31 | #F9FAFA | 6.26 | 4.5 | AA |
| Text primary on surfaceRaised | #23272A | #FFFFFF | 15.05 | 4.5 | AA |
| Text secondary on surfaceRaised | #5C6469 | #FFFFFF | 6.03 | 4.5 | AA |
| Link on surfaceRaised | #3C5A70 | #FFFFFF | 7.27 | 4.5 | AA |
| Accent as text on surfaceRaised | #0E2A47 | #FFFFFF | 14.57 | 4.5 | AA |
| Success text on surfaceRaised | #2E6B51 | #FFFFFF | 6.29 | 4.5 | AA |
| Warning text on surfaceRaised | #805518 | #FFFFFF | 6.50 | 4.5 | AA |
| Error text on surfaceRaised | #A33A31 | #FFFFFF | 6.55 | 4.5 | AA |
| Accent ink on accent (button) | #F3F4F4 | #0E2A47 | 13.23 | 4.5 | AA |
| Pin label on pinNow | #FFFFFF | #2E6B51 | 6.29 | 3.0 | AA |
| pinNow against bg (UI component) | #2E6B51 | #F3F4F4 | 5.71 | 3.0 | AA |
| Pin label on pinToday | #FFFFFF | #0E2A47 | 14.57 | 3.0 | AA |
| pinToday against bg (UI component) | #0E2A47 | #F3F4F4 | 13.23 | 3.0 | AA |
| Pin label on pinUpcoming | #FFFFFF | #48677D | 5.98 | 3.0 | AA |
| pinUpcoming against bg (UI component) | #48677D | #F3F4F4 | 5.43 | 3.0 | AA |
| Pin label on pinRecurring | #FFFFFF | #5E5B7A | 6.45 | 3.0 | AA |
| pinRecurring against bg (UI component) | #5E5B7A | #F3F4F4 | 5.86 | 3.0 | AA |
| Pin label on pinPast | #FFFFFF | #7E8588 | 3.75 | 3.0 | AA |
| pinPast against bg (UI component) | #7E8588 | #F3F4F4 | 3.40 | 3.0 | AA |
| Pin label on pinCluster | #FFFFFF | #5C6469 | 6.03 | 3.0 | AA |
| pinCluster against bg (UI component) | #5C6469 | #F3F4F4 | 5.47 | 3.0 | AA |

#### Marine Layer, dark

| Pair | Foreground | Background | Ratio | Needs | Result |
| --- | --- | --- | --- | --- | --- |
| Text primary on bg | #EDEFF0 | #15181A | 15.46 | 4.5 | AA |
| Text secondary on bg | #A2A9AE | #15181A | 7.49 | 4.5 | AA |
| Link on bg | #8FB0C6 | #15181A | 7.81 | 4.5 | AA |
| Accent as text on bg | #9DC1E4 | #15181A | 9.50 | 4.5 | AA |
| Success text on bg | #7FBB9C | #15181A | 8.06 | 4.5 | AA |
| Warning text on bg | #D2A868 | #15181A | 8.10 | 4.5 | AA |
| Error text on bg | #DE8F86 | #15181A | 7.12 | 4.5 | AA |
| Text primary on surface | #EDEFF0 | #1E2225 | 13.89 | 4.5 | AA |
| Text secondary on surface | #A2A9AE | #1E2225 | 6.73 | 4.5 | AA |
| Link on surface | #8FB0C6 | #1E2225 | 7.01 | 4.5 | AA |
| Accent as text on surface | #9DC1E4 | #1E2225 | 8.53 | 4.5 | AA |
| Success text on surface | #7FBB9C | #1E2225 | 7.24 | 4.5 | AA |
| Warning text on surface | #D2A868 | #1E2225 | 7.28 | 4.5 | AA |
| Error text on surface | #DE8F86 | #1E2225 | 6.39 | 4.5 | AA |
| Text primary on surfaceRaised | #EDEFF0 | #272C30 | 12.23 | 4.5 | AA |
| Text secondary on surfaceRaised | #A2A9AE | #272C30 | 5.92 | 4.5 | AA |
| Link on surfaceRaised | #8FB0C6 | #272C30 | 6.17 | 4.5 | AA |
| Accent as text on surfaceRaised | #9DC1E4 | #272C30 | 7.51 | 4.5 | AA |
| Success text on surfaceRaised | #7FBB9C | #272C30 | 6.37 | 4.5 | AA |
| Warning text on surfaceRaised | #D2A868 | #272C30 | 6.41 | 4.5 | AA |
| Error text on surfaceRaised | #DE8F86 | #272C30 | 5.63 | 4.5 | AA |
| Accent ink on accent (button) | #15181A | #9DC1E4 | 9.50 | 4.5 | AA |
| Pin label on pinNow | #15181A | #7FBB9C | 8.06 | 3.0 | AA |
| pinNow against bg (UI component) | #7FBB9C | #15181A | 8.06 | 3.0 | AA |
| Pin label on pinToday | #15181A | #9DC1E4 | 9.50 | 3.0 | AA |
| pinToday against bg (UI component) | #9DC1E4 | #15181A | 9.50 | 3.0 | AA |
| Pin label on pinUpcoming | #15181A | #8FB0C6 | 7.81 | 3.0 | AA |
| pinUpcoming against bg (UI component) | #8FB0C6 | #15181A | 7.81 | 3.0 | AA |
| Pin label on pinRecurring | #15181A | #A9A4C9 | 7.51 | 3.0 | AA |
| pinRecurring against bg (UI component) | #A9A4C9 | #15181A | 7.51 | 3.0 | AA |
| Pin label on pinPast | #15181A | #6C7478 | 3.74 | 3.0 | AA |
| pinPast against bg (UI component) | #6C7478 | #15181A | 3.74 | 3.0 | AA |
| Pin label on pinCluster | #15181A | #EDEFF0 | 15.46 | 3.0 | AA |
| pinCluster against bg (UI component) | #EDEFF0 | #15181A | 15.46 | 3.0 | AA |

#### Harbor, light

| Pair | Foreground | Background | Ratio | Needs | Result |
| --- | --- | --- | --- | --- | --- |
| Text primary on bg | #16223A | #F4F0E7 | 13.95 | 4.5 | AA |
| Text secondary on bg | #5A6272 | #F4F0E7 | 5.39 | 4.5 | AA |
| Link on bg | #2F4E7A | #F4F0E7 | 7.41 | 4.5 | AA |
| Accent as text on bg | #7A5A1E | #F4F0E7 | 5.58 | 4.5 | AA |
| Success text on bg | #2F6A4E | #F4F0E7 | 5.61 | 4.5 | AA |
| Warning text on bg | #875416 | #F4F0E7 | 5.58 | 4.5 | AA |
| Error text on bg | #A63A30 | #F4F0E7 | 5.65 | 4.5 | AA |
| Text primary on surface | #16223A | #FAF7F0 | 14.82 | 4.5 | AA |
| Text secondary on surface | #5A6272 | #FAF7F0 | 5.73 | 4.5 | AA |
| Link on surface | #2F4E7A | #FAF7F0 | 7.88 | 4.5 | AA |
| Accent as text on surface | #7A5A1E | #FAF7F0 | 5.93 | 4.5 | AA |
| Success text on surface | #2F6A4E | #FAF7F0 | 5.96 | 4.5 | AA |
| Warning text on surface | #875416 | #FAF7F0 | 5.93 | 4.5 | AA |
| Error text on surface | #A63A30 | #FAF7F0 | 6.00 | 4.5 | AA |
| Text primary on surfaceRaised | #16223A | #FFFDF8 | 15.60 | 4.5 | AA |
| Text secondary on surfaceRaised | #5A6272 | #FFFDF8 | 6.03 | 4.5 | AA |
| Link on surfaceRaised | #2F4E7A | #FFFDF8 | 8.29 | 4.5 | AA |
| Accent as text on surfaceRaised | #7A5A1E | #FFFDF8 | 6.24 | 4.5 | AA |
| Success text on surfaceRaised | #2F6A4E | #FFFDF8 | 6.27 | 4.5 | AA |
| Warning text on surfaceRaised | #875416 | #FFFDF8 | 6.24 | 4.5 | AA |
| Error text on surfaceRaised | #A63A30 | #FFFDF8 | 6.32 | 4.5 | AA |
| Accent ink on accent (button) | #F4F0E7 | #7A5A1E | 5.58 | 4.5 | AA |
| Pin label on pinNow | #FFFFFF | #2F6A4E | 6.38 | 3.0 | AA |
| pinNow against bg (UI component) | #2F6A4E | #F4F0E7 | 5.61 | 3.0 | AA |
| Pin label on pinToday | #FFFFFF | #7A5A1E | 6.35 | 3.0 | AA |
| pinToday against bg (UI component) | #7A5A1E | #F4F0E7 | 5.58 | 3.0 | AA |
| Pin label on pinUpcoming | #FFFFFF | #2F4E7A | 8.43 | 3.0 | AA |
| pinUpcoming against bg (UI component) | #2F4E7A | #F4F0E7 | 7.41 | 3.0 | AA |
| Pin label on pinRecurring | #FFFFFF | #5E5679 | 6.81 | 3.0 | AA |
| pinRecurring against bg (UI component) | #5E5679 | #F4F0E7 | 5.99 | 3.0 | AA |
| Pin label on pinPast | #FFFFFF | #867F72 | 3.97 | 3.0 | AA |
| pinPast against bg (UI component) | #867F72 | #F4F0E7 | 3.49 | 3.0 | AA |
| Pin label on pinCluster | #FFFFFF | #16223A | 15.86 | 3.0 | AA |
| pinCluster against bg (UI component) | #16223A | #F4F0E7 | 13.95 | 3.0 | AA |

#### Harbor, dark

| Pair | Foreground | Background | Ratio | Needs | Result |
| --- | --- | --- | --- | --- | --- |
| Text primary on bg | #F1ECE1 | #0F1A2B | 14.82 | 4.5 | AA |
| Text secondary on bg | #A7AEBC | #0F1A2B | 7.83 | 4.5 | AA |
| Link on bg | #8FB4E0 | #0F1A2B | 8.12 | 4.5 | AA |
| Accent as text on bg | #CBA55B | #0F1A2B | 7.54 | 4.5 | AA |
| Success text on bg | #7FBB9C | #0F1A2B | 7.89 | 4.5 | AA |
| Warning text on bg | #D8AC5E | #0F1A2B | 8.30 | 4.5 | AA |
| Error text on bg | #E08E84 | #0F1A2B | 6.96 | 4.5 | AA |
| Text primary on surface | #F1ECE1 | #172438 | 13.24 | 4.5 | AA |
| Text secondary on surface | #A7AEBC | #172438 | 7.00 | 4.5 | AA |
| Link on surface | #8FB4E0 | #172438 | 7.26 | 4.5 | AA |
| Accent as text on surface | #CBA55B | #172438 | 6.74 | 4.5 | AA |
| Success text on surface | #7FBB9C | #172438 | 7.05 | 4.5 | AA |
| Warning text on surface | #D8AC5E | #172438 | 7.42 | 4.5 | AA |
| Error text on surface | #E08E84 | #172438 | 6.22 | 4.5 | AA |
| Text primary on surfaceRaised | #F1ECE1 | #203047 | 11.32 | 4.5 | AA |
| Text secondary on surfaceRaised | #A7AEBC | #203047 | 5.98 | 4.5 | AA |
| Link on surfaceRaised | #8FB4E0 | #203047 | 6.20 | 4.5 | AA |
| Accent as text on surfaceRaised | #CBA55B | #203047 | 5.76 | 4.5 | AA |
| Success text on surfaceRaised | #7FBB9C | #203047 | 6.03 | 4.5 | AA |
| Warning text on surfaceRaised | #D8AC5E | #203047 | 6.34 | 4.5 | AA |
| Error text on surfaceRaised | #E08E84 | #203047 | 5.31 | 4.5 | AA |
| Accent ink on accent (button) | #0F1A2B | #CBA55B | 7.54 | 4.5 | AA |
| Pin label on pinNow | #0F1A2B | #7FBB9C | 7.89 | 3.0 | AA |
| pinNow against bg (UI component) | #7FBB9C | #0F1A2B | 7.89 | 3.0 | AA |
| Pin label on pinToday | #0F1A2B | #CBA55B | 7.54 | 3.0 | AA |
| pinToday against bg (UI component) | #CBA55B | #0F1A2B | 7.54 | 3.0 | AA |
| Pin label on pinUpcoming | #0F1A2B | #8FB4E0 | 8.12 | 3.0 | AA |
| pinUpcoming against bg (UI component) | #8FB4E0 | #0F1A2B | 8.12 | 3.0 | AA |
| Pin label on pinRecurring | #0F1A2B | #ABA4CD | 7.42 | 3.0 | AA |
| pinRecurring against bg (UI component) | #ABA4CD | #0F1A2B | 7.42 | 3.0 | AA |
| Pin label on pinPast | #0F1A2B | #6B7382 | 3.66 | 3.0 | AA |
| pinPast against bg (UI component) | #6B7382 | #0F1A2B | 3.66 | 3.0 | AA |
| Pin label on pinCluster | #0F1A2B | #F1ECE1 | 14.82 | 3.0 | AA |
| pinCluster against bg (UI component) | #F1ECE1 | #0F1A2B | 14.82 | 3.0 | AA |

#### Olive and Ivory, light

| Pair | Foreground | Background | Ratio | Needs | Result |
| --- | --- | --- | --- | --- | --- |
| Text primary on bg | #22261E | #F3F0E5 | 13.49 | 4.5 | AA |
| Text secondary on bg | #5C6156 | #F3F0E5 | 5.58 | 4.5 | AA |
| Link on bg | #4B5E3E | #F3F0E5 | 6.20 | 4.5 | AA |
| Accent as text on bg | #8A3D1F | #F3F0E5 | 6.65 | 4.5 | AA |
| Success text on bg | #356A48 | #F3F0E5 | 5.57 | 4.5 | AA |
| Warning text on bg | #84561A | #F3F0E5 | 5.53 | 4.5 | AA |
| Error text on bg | #A3382E | #F3F0E5 | 5.82 | 4.5 | AA |
| Text primary on surface | #22261E | #F9F7EE | 14.35 | 4.5 | AA |
| Text secondary on surface | #5C6156 | #F9F7EE | 5.93 | 4.5 | AA |
| Link on surface | #4B5E3E | #F9F7EE | 6.59 | 4.5 | AA |
| Accent as text on surface | #8A3D1F | #F9F7EE | 7.07 | 4.5 | AA |
| Success text on surface | #356A48 | #F9F7EE | 5.92 | 4.5 | AA |
| Warning text on surface | #84561A | #F9F7EE | 5.88 | 4.5 | AA |
| Error text on surface | #A3382E | #F9F7EE | 6.19 | 4.5 | AA |
| Text primary on surfaceRaised | #22261E | #FFFEF7 | 15.23 | 4.5 | AA |
| Text secondary on surfaceRaised | #5C6156 | #FFFEF7 | 6.30 | 4.5 | AA |
| Link on surfaceRaised | #4B5E3E | #FFFEF7 | 6.99 | 4.5 | AA |
| Accent as text on surfaceRaised | #8A3D1F | #FFFEF7 | 7.50 | 4.5 | AA |
| Success text on surfaceRaised | #356A48 | #FFFEF7 | 6.28 | 4.5 | AA |
| Warning text on surfaceRaised | #84561A | #FFFEF7 | 6.24 | 4.5 | AA |
| Error text on surfaceRaised | #A3382E | #FFFEF7 | 6.57 | 4.5 | AA |
| Accent ink on accent (button) | #F3F0E5 | #8A3D1F | 6.65 | 4.5 | AA |
| Pin label on pinNow | #FFFFFF | #356A48 | 6.35 | 3.0 | AA |
| pinNow against bg (UI component) | #356A48 | #F3F0E5 | 5.57 | 3.0 | AA |
| Pin label on pinToday | #FFFFFF | #8A3D1F | 7.59 | 3.0 | AA |
| pinToday against bg (UI component) | #8A3D1F | #F3F0E5 | 6.65 | 3.0 | AA |
| Pin label on pinUpcoming | #FFFFFF | #4B5E3E | 7.07 | 3.0 | AA |
| pinUpcoming against bg (UI component) | #4B5E3E | #F3F0E5 | 6.20 | 3.0 | AA |
| Pin label on pinRecurring | #FFFFFF | #5F5A78 | 6.52 | 3.0 | AA |
| pinRecurring against bg (UI component) | #5F5A78 | #F3F0E5 | 5.72 | 3.0 | AA |
| Pin label on pinPast | #FFFFFF | #84837A | 3.81 | 3.0 | AA |
| pinPast against bg (UI component) | #84837A | #F3F0E5 | 3.34 | 3.0 | AA |
| Pin label on pinCluster | #FFFFFF | #22261E | 15.40 | 3.0 | AA |
| pinCluster against bg (UI component) | #22261E | #F3F0E5 | 13.49 | 3.0 | AA |

#### Olive and Ivory, dark

| Pair | Foreground | Background | Ratio | Needs | Result |
| --- | --- | --- | --- | --- | --- |
| Text primary on bg | #EFECE1 | #191C15 | 14.57 | 4.5 | AA |
| Text secondary on bg | #A8AB9E | #191C15 | 7.37 | 4.5 | AA |
| Link on bg | #A9B98F | #191C15 | 8.23 | 4.5 | AA |
| Accent as text on bg | #D9946E | #191C15 | 6.90 | 4.5 | AA |
| Success text on bg | #84BB99 | #191C15 | 7.84 | 4.5 | AA |
| Warning text on bg | #D4A961 | #191C15 | 7.92 | 4.5 | AA |
| Error text on bg | #DE8F86 | #191C15 | 6.88 | 4.5 | AA |
| Text primary on surface | #EFECE1 | #22261D | 13.03 | 4.5 | AA |
| Text secondary on surface | #A8AB9E | #22261D | 6.59 | 4.5 | AA |
| Link on surface | #A9B98F | #22261D | 7.35 | 4.5 | AA |
| Accent as text on surface | #D9946E | #22261D | 6.17 | 4.5 | AA |
| Success text on surface | #84BB99 | #22261D | 7.01 | 4.5 | AA |
| Warning text on surface | #D4A961 | #22261D | 7.08 | 4.5 | AA |
| Error text on surface | #DE8F86 | #22261D | 6.15 | 4.5 | AA |
| Text primary on surfaceRaised | #EFECE1 | #2C3127 | 11.27 | 4.5 | AA |
| Text secondary on surfaceRaised | #A8AB9E | #2C3127 | 5.70 | 4.5 | AA |
| Link on surfaceRaised | #A9B98F | #2C3127 | 6.36 | 4.5 | AA |
| Accent as text on surfaceRaised | #D9946E | #2C3127 | 5.34 | 4.5 | AA |
| Success text on surfaceRaised | #84BB99 | #2C3127 | 6.06 | 4.5 | AA |
| Warning text on surfaceRaised | #D4A961 | #2C3127 | 6.12 | 4.5 | AA |
| Error text on surfaceRaised | #DE8F86 | #2C3127 | 5.32 | 4.5 | AA |
| Accent ink on accent (button) | #191C15 | #D9946E | 6.90 | 4.5 | AA |
| Pin label on pinNow | #191C15 | #84BB99 | 7.84 | 3.0 | AA |
| pinNow against bg (UI component) | #84BB99 | #191C15 | 7.84 | 3.0 | AA |
| Pin label on pinToday | #191C15 | #D9946E | 6.90 | 3.0 | AA |
| pinToday against bg (UI component) | #D9946E | #191C15 | 6.90 | 3.0 | AA |
| Pin label on pinUpcoming | #191C15 | #A9B98F | 8.23 | 3.0 | AA |
| pinUpcoming against bg (UI component) | #A9B98F | #191C15 | 8.23 | 3.0 | AA |
| Pin label on pinRecurring | #191C15 | #ADA6CC | 7.47 | 3.0 | AA |
| pinRecurring against bg (UI component) | #ADA6CC | #191C15 | 7.47 | 3.0 | AA |
| Pin label on pinPast | #191C15 | #6E7268 | 3.50 | 3.0 | AA |
| pinPast against bg (UI component) | #6E7268 | #191C15 | 3.50 | 3.0 | AA |
| Pin label on pinCluster | #191C15 | #EFECE1 | 14.57 | 3.0 | AA |
| pinCluster against bg (UI component) | #EFECE1 | #191C15 | 14.57 | 3.0 | AA |

## 6. Typography

| Role | Family | Fallback | Source |
| --- | --- | --- | --- |
| Display | Instrument Serif (Regular, Italic) | Fraunces, Georgia | Google Fonts, github.com/Instrument/instrument-serif (OFL) |
| UI and body | Geist (Regular, Medium, SemiBold, Variable) | Inter, system sans | npm `geist`, github.com/vercel/geist-font (OFL) |
| System chrome (iOS) | SF Pro | | Provided by iOS. Tab bar, toolbars, alerts, sheets, context menus under Liquid Glass are never overridden. |
| Mono | Geist Mono | SF Mono, Menlo | Debug, plate numbers if Geist tabular figures are unavailable |

Font feature settings: Geist UI text uses `tnum` for anything with numbers in columns and `case` for uppercase plate labels. Instrument Serif uses `liga`. Do not use Instrument Serif Italic in the app except in pull quotes on a host page; it is reserved for marketing.

### Type scale

Sizes in points on iOS and px on web. Line heights are absolute. Tracking is in points (iOS `kerning`) or the em equivalent on web.

| Style | Family, weight | Size / line | Tracking | iOS text style | Where |
| --- | --- | --- | --- | --- | --- |
| Display | Instrument Serif 400 | 40 / 44 | -0.4 | largeTitle (custom font, scales with Dynamic Type) | Feed masthead ("This weekend"), onboarding, empty state headline |
| Title | Instrument Serif 400 | 28 / 32 | -0.2 | title | Event name on detail, host name on host page |
| Headline | Instrument Serif 400 | 22 / 26 | 0 | title2 | Card titles, section headers |
| Subhead | Geist 500 | 15 / 20 | 0 | subheadline | Buttons, list row titles, tab labels (SF on iOS tab bar) |
| Body | Geist 400 | 16 / 24 | 0 | body | Descriptions, comments, host welcome |
| Caption | Geist 500 | 12 / 16 | +0.2 | caption | Metadata rows, chips, timestamps |
| Plate | Geist 500, `tnum` `case`, uppercase | 13 / 16 | +0.6 | footnote | Times, distances, dates, counts: SAT 7:30 AM, 4.2 MI, 42 GOING |
| Label | Geist 500, uppercase | 11 / 14 | +0.8 | caption2 | Eyebrows, "SOCIAL CLUB" in lockups, section labels |

The plate style is named after a license plate: uppercase, tabular, tracked, always in `textSecondary` unless it is the primary fact on the screen (the time on an event detail). It is the only uppercase text in the product.

### Where the serif appears

| Serif, yes | Serif, no |
| --- | --- |
| Wordmark and lockups | Buttons and any tappable label |
| Feed masthead and section headers | Tab bar, toolbars, navigation titles in the compact state (SF Pro) |
| Event titles on cards and detail | Metadata, captions, chips, times, distances |
| Host names on host pages | Body text and descriptions |
| Onboarding headlines and empty-state headlines | Form fields, placeholders, errors |
| Marketing display copy | Anything under 20pt |

One serif headline per screen, then everything else in Geist. When the large title collapses into the glass toolbar on scroll, the compact title is SF Pro, not the serif.

## 7. Layout under Liquid Glass

Glass is the navigation layer. Content is flat. Everything in this section follows from that.

| Principle | In practice |
| --- | --- |
| Glass is the nav layer only | Tab bar, top toolbar, bottom search on Map, and sheet chrome are system glass. Nothing in the content area is glass, frosted, or translucent. |
| Content is flat | Cards are `surface` on `bg` separated by 1px `border` rules or by 16pt of whitespace, not both. Sheets and menus use `surfaceRaised`. Elevation is expressed by tone, never by shadow. |
| Hairline rules | 1px in `border`. Horizontal rules span the content width, not the screen width. Section headers sit on a rule, not above a colored bar. |
| No shadows heavier than a hairline | Allowed: `0 0 0 1px border`. Not allowed: drop shadows, blur, inner glow, gradient borders. |
| Photography desaturated and cool | Photos ship through the photo treatment (section 11): -20 saturation, slight cool shift, lifted blacks. Cards are photo first at 4:3, with `scrim` under the title. |
| Generous whitespace | Page gutter 20pt. Vertical rhythm on a 4pt grid: 8 between related rows, 16 between groups, 32 between sections, 48 above a section header. When in doubt, add space and remove a rule. |
| Left-aligned editorial hierarchy | Everything left-aligned to the gutter, including empty states and onboarding. Centered text only inside pins, tab labels, and the app icon. Headline, then plate, then body: the order a magazine caption reads. |
| Content edge to edge | Photos, map, and lists extend under the tab bar and toolbar. Bottom content inset 88pt (tab bar) or 156pt (Map with bottom search). |
| One accent per screen | The accent goes on the single action that matters (I'm going, Post, Paste a link) and on the today pin. Everything else is ink, grey, and glass. |
| Corners small | Content radius 10 to 14pt. Only system glass containers use large radii. Buttons 8pt. Pills are for chips only. |
| Motion is system motion | Tab morphs, sheet detents, and toolbar collapse are the system's. Custom motion is limited to a matched-geometry photo on card-to-detail (0.4s spring) and a crossfade everywhere else. Reduce Motion makes everything a crossfade. |

Web mirrors this: `backdrop-filter: blur(20px) saturate(1.1)` on the header only, `glassTint` behind it, hairlines everywhere else, `pageMax` 1120px, `readingMax` 640px.

## 8. Iconography

SF Symbols on iOS, rendered at the **thin** weight for content icons and at the system's default weight inside the glass tab bar (the tab bar sets its own weight). On web, Lucide at 1.25px stroke as the stand-in, matched to SF thin. Icons are monochrome in `textPrimary` or `textSecondary`; the accent color never fills an icon except the going checkmark.

| Slot | Symbol | Notes |
| --- | --- | --- |
| Tab: Feed | `newspaper` / `newspaper.fill` | Unselected / selected |
| Tab: Map | `map` / `map.fill` | |
| Tab: Activity | `bell` / `bell.fill` | Badge for unread, badge in accent |
| Tab: Profile | `person.crop.circle` / `person.crop.circle.fill` | |
| Create | `plus` | Trailing glass accessory button beside the tab pill |
| Search | `magnifyingglass` | Bottom search on Map |
| Filters | `line.3.horizontal.decrease` | |
| Date | `calendar` | |
| Time | `clock` | |
| Location | `mappin.and.ellipse` | |
| Directions | `arrow.triangle.turn.up.right.diamond` | |
| Distance | `location` | |
| Host | `person.crop.circle.badge.checkmark` | |
| Going | `checkmark.circle.fill` | Only icon that may take the accent |
| Not going | `circle` | |
| Recurring | `repeat` | Also the recurring pin glyph |
| Share | `square.and.arrow.up` | |
| Photos | `photo.on.rectangle` | |
| Camera, check-in | `camera` | |
| Comment | `bubble.left` | |
| Source link | `link` | Opens the host's original post |
| Import | `link.badge.plus` | |
| Garage | `car` | The one place a car symbol appears |
| Follow / following | `plus.circle` / `checkmark.circle` | |
| Confidence high / medium / low | `checkmark.seal` / `questionmark.circle` / `exclamationmark.triangle` | Import preview, tinted success / warning / error |
| List / map toggle | `list.bullet` / `map` | |
| Sign in with Apple | `apple.logo` | |
| Theme picker | `circle.lefthalf.filled` | Settings |

## 9. Logo system

Two directions, both drawn from real outlines. Wordmarks are Instrument Serif converted to paths and edited; monograms are geometry on a 64-unit grid. All files are clean SVG with a viewBox and no font dependencies, in `logos/`. Each mark ships in three color variants: ink (`#23272A`, file has no suffix), light (`#EDEFF0`, `-light`), and accent (Lido Blue `#0E2A47`, `-accent`).

### Wordmarks (lowercase curb)

| File | Detail | Use |
| --- | --- | --- |
| `wordmark-01-chamfer.svg` | The flag serif at the top of the b is replaced with a 45 degree chamfer, the profile of a curb edge. Top of the stem squared. **Primary.** | Everything: app, web header, social, print. |
| `wordmark-02-horizon.svg` | Unaltered letters on a hairline horizon rule the width of the word. | Marketing where the mark sits alone on a page; the rule doubles as a layout rule. |
| `wordmark-03-italic.svg` | Instrument Serif Italic, tracked -6. | Editorial and print only (a magazine ad, a sticker). Never in the app. |
| `wordmark-04-tight.svg` | Roman letters tracked -34 so the word reads as one block. | Small sizes under 24px tall where the primary's chamfer would drop below 1px. |

### Lockups

| File | Content | Use |
| --- | --- | --- |
| `lockup-horizontal-01.svg` | CURB SOCIAL CLUB in Instrument Serif small caps (capitals at 76%, tracked +90) | Legal, formal, press, footers, the About screen. |
| `lockup-horizontal-02.svg` | curb wordmark, hairline, SOCIAL CLUB in Geist Medium caps | Web header, email header, palette cards. The everyday full-name lockup. |
| `lockup-horizontal-03.svg` | Monogram at x-height beside the wordmark | Partner co-branding, watermarks, merchandise. |
| `lockup-stacked-01.svg` | Wordmark over a horizon rule over SOCIAL CLUB justified to the same width | Square placements: social avatars at large size, stickers, splash. |

### Monograms (curb-profile C)

An abstract C read as a curb in cross-section: a flat top (sidewalk), a chamfered outer edge (the curb's cast edge), a vertical face, and a square foot where the face meets the gutter. Stroke 12 on a 64 grid, so at 16px the stroke is 3px and the chamfer is 1px.

| File | Construction | Reads at 16px | Use |
| --- | --- | --- | --- |
| `monogram-01-stroke.svg` | Uniform 12-unit stroke, outer chamfer 12, inner chamfer at the parallel offset (5). **Primary.** | Yes, verified in `work/check2.png` | App icon, favicon, avatar, tab, watermark. |
| `monogram-02-block.svg` | Solid C: 10-unit lip, 16-unit face, 12-unit gutter slab, the lip stops 8 short of the slab (the step). | Yes | Heavy placements: embroidery, stamps, dark photo overlays. |
| `monogram-03-horizon.svg` | The stroke C with its foot extended to the edge of the box, the road running out to the horizon. | Yes | Marketing, splash screen, the social card. Not for the icon (asymmetric in the squircle). |
| `monogram-04-rolled.svg` | Uniform stroke with a 20-unit radius on the outer top-left, the rolled curb of a Newport residential street. | Yes | Alternate if the chamfer reads too hard next to rounded iOS chrome. Keep as an option, do not mix with 01 in one surface. |

### Usage rules

| Rule | Detail |
| --- | --- |
| Clear space, wordmark | The height of the c (x-height) on all sides. Nothing inside it, including rules. |
| Clear space, monogram | One stroke width (12/64 of the mark's height) minimum, half the mark's height preferred. |
| Minimum size, wordmark | 72px wide on screen (the chamfer stays above 1px), 18mm in print. Below 72px use `wordmark-04-tight` or the monogram. |
| Minimum size, monogram | 16px. |
| Minimum size, lockups | Horizontal 01: 200px wide. Horizontal 02: 160px. Stacked: 96px wide. |
| Color | One of the three variants. Ink on light surfaces, light on `textPrimary` or photo scrims, accent on `bg` only (never accent on a photo). Never two colors inside one mark. |
| Backgrounds | Flat color or a photo under `scrim`. Never on a gradient, never in a circle badge, never with an outline or a shadow. |
| Rotation, distortion, effects | None. No italicizing the roman marks, no outlines, no glass effects on the marks themselves. |
| Pairing | Wordmark and monogram may appear on the same screen only in `lockup-horizontal-03`. Otherwise one mark per surface. |
| Which variant goes where | App icon and favicon: monogram 01. iOS large title on Feed: the word "curb" set live in Instrument Serif, not the SVG (Dynamic Type must work). Web header: lockup 02 at 40px tall. Splash: monogram 03 centered on `bg`. Social avatar: monogram 01 on `textPrimary`. Legal and About: lockup 01. Email: lockup 02. Print: wordmark 01 or lockup stacked. |

## 10. App icon (iOS 26 layered)

Built in Icon Composer from two flat layers per theme, in `icons/<theme>/`. The system renders light, dark, clear, and tinted appearances; because both layers are single solid colors and the mark is a silhouette, all four appearances hold without extra assets.

| Theme | Background layer | Foreground layer | Files |
| --- | --- | --- | --- |
| Marine Layer (default) | Wet asphalt `#23272A` | Fog `#EDEFF0` monogram 01 | `icons/marine-layer/background.svg`, `foreground.svg`, `icon-1024.png` |
| Harbor | Deep navy `#16223A` | Brass `#CBA55B` monogram 01 | `icons/harbor/...` |
| Olive and Ivory | Sage olive `#4B5E3E` | Ivory `#EFECE1` monogram 01 | `icons/olive-ivory/...` |

Icon Composer settings: background layer with no blur and no specular, foreground layer with glass **off**, specular **off**, shadow **none**, translucency 0. The C is 58% of the canvas tall, centered on its own bounds (not on the 64 grid box), which keeps it inside the safe zone with the squircle applied. No text, no rounded rectangle inside the layers (iOS applies the mask). The flattened `icon-1024.png` is square and goes to App Store Connect and to Expo's `icon` field. The `preview-360.png` files have a squircle mask baked in for documents only.

The theme the user picks in Settings switches the alternate icon (`UIApplication.setAlternateIconName`) to match, with Marine Layer as the primary icon. Alternate icons are flattened PNGs at 1024 until Expo supports `.icon` bundles for alternates.

## 11. Photography

| Direction | Detail |
| --- | --- |
| Light | Overcast, early. 6:30 to 9:00 am under a marine layer. No golden hour, no midday sun, no night. |
| Feel | 35mm. Fixed lens, eye level or slightly low, the frame includes the lot, the curb, the coffee, the person. |
| Cars in context | A car next to another car, a car with a door open and a cup on the roof, a row along a curb. Never a car alone on a pedestal, never a three-quarter studio angle, never a badge close-up. |
| Color | Desaturated and cool. Treatment on upload for editorial surfaces: saturation -20, temperature -200K equivalent, blacks lifted to `#15181A`, no clarity, no HDR, no vignette. User photos in feeds get the same treatment at half strength. |
| People | Present, unposed, mid-conversation. Backs and hands are fine. No group shots facing the camera. |
| Crop | 4:3 for cards, 16:9 for the detail hero, 1:1 for avatars. Horizon level. Leave space at the bottom for the scrim and title. |
| Never | HDR, drone shots, rolling shots, smoke, wet-look filters, watermarks, dealer plates, license plates legible (blur them). |

## 12. Do and don't

| Do | Don't |
| --- | --- |
| Use Marine Layer unless the user picks otherwise. | Mix themes on one screen. |
| One serif headline, one accent action per screen. | Serif in a button. Accent on two things. |
| Put Lido Blue on the action and the today pin, nothing else. | Use the accent as a tint, a background band, an icon fill, or on a photo. |
| Write times and distances in the plate style. | Write "7:30AM" or "7.30" or "4.2 miles away!!!" |
| Say "cars and coffee meets" in lowercase. | Call the product Cars and Coffee, or capitalize the category. |
| Separate content with 1px rules or whitespace. | Drop shadows, gradients, glows, glass in the content area. |
| Use monogram 01 for the icon and wordmark 01 everywhere else. | Put a car silhouette, a Porsche shape, a coffee cup, or steam in any mark. |
| Desaturate and cool photos, keep the horizon level. | HDR, golden hour, rolling shots. |
| Welcome every car in the copy. | "Exclusive", "members only", "elite", "supercar". |
| Credit and link the host. | Claim a meet as ours. |
| Keep "curb" lowercase. | "Curb", "CURB", "CSC". |

## 13. Files

| Path | What |
| --- | --- |
| `brand-v2/brand-guide.md` | This document |
| `brand-v2/tokens.json` | Themed tokens, copied to `packages/design-tokens/tokens.json` |
| `brand-v2/logos/*.svg` | 12 marks x 3 color variants, 36 files |
| `brand-v2/icons/<theme>/` | Icon Composer layers, 1024 PNG, 360 preview |
| `brand-v2/brand-sheet.png` | 2400x1600 overview |
| `brand-v2/palette-<theme>.png` | 1600x1000 palette card per theme, light and dark |
| `brand-v2/social-card-1200x630.png` | Open Graph and iMessage preview, Marine Layer |
| `brand-v2/fonts/` | Instrument Serif (Regular, Italic) and Geist (Regular, Medium, SemiBold, Variable, Mono) as fetched |
| `brand-v2/work/` | Generators: `palette.py` (colors, contrast, tokens), `logos.py`, `icons.py`, `sheets.py` |

## 14. Changelog

| Version | Date | Change |
| --- | --- | --- |
| v2.1 | 2026-09-05 | Marine Layer accent changed from oxblood #5E2A2E to Lido Blue #0E2A47; dark lift #9DC1E4; cluster pin moved to textSecondary. |
| v2.0 | 2026-09-05 | Curb Social Club brand: three flat themes, Instrument Serif and Geist, curb-profile monogram. Supersedes the Cars and Coffee amber brand. |

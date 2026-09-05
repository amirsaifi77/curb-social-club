# Cars and Coffee Brand Guide

Version 0.1, 2026-09-05. Companion files: `tokens.json`, `assets/`. This guide is written for a solo builder shipping iOS first on the iOS 26 Liquid Glass design language, then a React web app. It favors decisions over options.

## 1. Brand essence and positioning

**Essence:** the feeling of a Saturday morning parking lot at 7:30am. Low sun, warm coffee, a Miata parked next to a McLaren and nobody minding.

**Positioning statement:** Cars and Coffee is the local, welcoming way to find and share car meets near you. It meets people where they already organize (Instagram, Facebook, Evite, group chats) and makes the meet easy to find, easy to join, and easy to share.

| We are | We are not |
| --- | --- |
| Local first. Inland Empire, OC, LA, then outward. | A national events marketplace. |
| Inclusive of every car and every budget. | Exclusive, invite-only, or "supercar only". |
| Morning light: warm, calm, optimistic. | Neon night-scene, aggressive, tuner-forum energy. |
| Integrated: link out to the source, import from it. | A walled garden that fights the organizer's existing tools. |
| Useful without an account. | Sign-up gated. |

Three words to keep every screen honest: **local, warm, open.**

## 2. Naming

Working name: **Cars and Coffee**. The phrase is a generic description of a type of event and is used by many independent groups (Cars and Coffee Irvine, Cars & Coffee Del Mar, and others). Some regional operators hold registered marks that include the phrase. Treat the name as descriptive and expect that it cannot be owned. Consequences:

1. The visual identity (mark, palette, tone) has to carry distinctiveness. The name will not.
2. Do not use "Cars and Coffee" alone as an App Store title. Pair it with a distinctive word, or ship under an alternate name and use "cars and coffee" as the category phrase in the subtitle and keywords.
3. Check USPTO TESS and the App Store for conflicts before submission.

Alternate name directions (hedge):

| Name | Direction | Why it fits |
| --- | --- | --- |
| **Sunrise Meet** | Morning light, plain English | Says when and what. Domain and handle likely available. |
| **Lot** | Short, place-based | The parking lot is the venue. "See you at the Lot." Strong for a wordmark, harder for search. |
| **Cars & Coffee: Meetfinder** | Descriptive plus a distinctive suffix | Keeps category SEO, adds an ownable tail. |
| **Curb** | One syllable, automotive, casual | Curb appeal, curbside. Easy icon pairing with the mark. |
| **Idle** | Engine and morning slowness | Warm and clever; risks reading as "lazy" to non-enthusiasts. |

Recommendation: build under "Cars and Coffee" for now, keep the mark name-independent (it never spells out the name), and revisit before the App Store listing.

## 3. Voice and tone

Voice: a friend who knows the local scene. Plain, warm, a little dry. Never hype, never gatekeeping, never "bro". Short sentences. Specific over generic ("Saturday 7 to 10am at the Ontario Mills lot" beats "an amazing event").

Rules:

| Do | Don't |
| --- | --- |
| Name the place and the time. | "Epic", "exclusive", "elite", "insane". |
| Welcome every car. "Bring whatever you drive." | Rank cars or people. |
| Credit the organizer and link to the source. | Pretend the meet is ours. |
| Use "meet", "host", "going". | "Event ticket", "attendee", "activation". |
| Sentence case everywhere. | Title Case Buttons. |

Example copy:

| Context | Copy |
| --- | --- |
| Feed empty (no location) | **Nothing nearby yet.** Turn on location or pick a city to see this weekend's meets. |
| Map empty (zoomed to nowhere) | **No meets here yet.** Zoom out, or add the one you know about. |
| Following empty | **You're not following anyone yet.** Follow a host and their meets show up here first. |
| Garage empty | **Your garage is empty.** Add what you drive. Daily beaters welcome. |
| Past meet with no photos | **No photos yet.** Were you there? Add a few. |
| Push: new meet nearby | New meet 4 mi away: Saturday Coffee & Cars, Sat 7am, Rancho Cucamonga. |
| Push: host posted | Inland Empire Sunrise Meets posted a new meet for Sat, Sep 12. |
| Push: reminder | Tomorrow 7am: Coffee & Cars Fontana. 42 going. Want directions? |
| Push: photos | 18 new photos from this morning's meet in Riverside. |
| Primary CTA (event) | I'm going |
| Secondary CTA (event) | Share meet |
| Import CTA | Paste a link |
| Import success | Looks right? Fix anything we got wrong, then post. |
| Import failure | Couldn't read that link. Try a public Evite, Eventbrite, or Meetup link, or fill it in by hand. |
| Sign-in prompt | Sign in to RSVP, post photos, and follow hosts. Browsing is always free. |
| Recurring label | Every Saturday, 7 to 10am |

Push notification rules: max 90 characters, lead with distance or time, name the host, no emoji in the body.

## 4. Color

### Why warm amber, not morning sky

Both directions were considered. **Amber wins** for four reasons:

1. Maps are cool and neutral. Apple Maps, Google Maps, and Mapbox default styles are mostly greys, greens, and blues. An amber accent makes pins, "going" buttons, and glass tints read against any basemap. A sky-blue primary would fight the basemap and every other map app.
2. Under Liquid Glass, the nav layer is colorless. The glass takes its character from what is beneath it. Warm content (amber, cream, car and coffee photos) refracts as warmth; a blue primary would leave the glass looking like stock iOS.
3. It carries "coffee" and "morning light" in one hue.
4. It separates us from car apps that lean black, red, and chrome.

Sky is kept as the **secondary** for the "morning" half of the story, for informational UI, links, and the "upcoming" pin state.

### Primary: Amber

| Token | Hex | Use |
| --- | --- | --- |
| amber.100 | #FDF0DC | Tints, selected row backgrounds |
| amber.200 | #FAD9A6 | Chip fills (light) |
| amber.300 | #F5B865 | Dark mode accent, dark mode button fill |
| amber.400 | #F0A040 | Gradient mid stop |
| amber.500 | #E8871E | **Primary accent.** Button fills, pin "today", tinted glass |
| amber.600 | #A8590A | Accent as text on light backgrounds |
| amber.700 | #8F4B07 | Pressed state, text on cream when extra contrast needed |
| espresso | #2A1A10 | Brand dark. Logo, text on amber buttons, clusters |

Use amber.500 as a **fill with espresso text**, never as a fill with white text (white on amber.500 is 2.65:1 and fails).

### Secondary: Sky

| Token | Hex | Use |
| --- | --- | --- |
| sky.200 | #BFDDF5 | Info tint |
| sky.300 | #8CC3EE | Dark mode link |
| sky.500 | #4A8FCB | Pin "upcoming", illustrative |
| sky.600 | #2C6BA3 | Links and info text on light |

### Neutrals

| Role | Light | Dark |
| --- | --- | --- |
| Background | cream #FBF7F1 | night.bg #141110 |
| Surface (cards) | white #FFFFFF | night.surface #1E1917 |
| Surface secondary | paper #F5EFE8 | night.elevated #2A2320 |
| Border | sand #E7DED4 | night.border #3A312C |
| Text | ink #1F1712 | paper #F5EFE8 |
| Text secondary | mocha #6B5F57 | stone #B3A79D |
| Text tertiary | taupe #8A7E74 | taupe #8A7E74 |

Neutrals are warm on purpose (a hint of red-yellow in every grey) so photos of cars at dawn sit comfortably and the glass never goes cold.

### Semantic

| Role | Light text | Fill / tint | Dark text |
| --- | --- | --- | --- |
| Success | #1E7A4A | #E3F5EA | #6FD39B |
| Warning | #8A5A00 | #E0A800 fill, #FFF4D6 tint | #F3C463 |
| Error | #C1272D | #FDE7E8 | #F58A8E |
| Info | #2C6BA3 | #E6F2FB | #8CC3EE |

Confidence chips on the import preview use these: high = success, medium = warning, low = error, each with a short label ("Sure", "Check", "Guess").

### Map pins

| State | Hex | Label color | Meaning |
| --- | --- | --- | --- |
| Now | #1E7A4A | white | Meet is happening right now |
| Today | #E8871E | espresso | Starts later today |
| Upcoming | #4A8FCB | white | This week or later |
| Recurring | #7C5CC4 | white | Weekly or monthly series |
| Past | #B3A79D | white | Ended, photos only |
| Cluster | #2A1A10 | white | Count badge |
| Selected | any of above, 2px white ring, 1.2x scale | | |

Pins are teardrop-free: a filled circle with a 2px white ring and a small SF Symbol inside (`car.fill` for one-off, `repeat` for recurring). Simple shapes survive glass blur and clustering.

### Contrast check (WCAG 2.1)

Computed with the relative luminance formula. AA normal text requires 4.5:1, AA large text or UI components 3:1.

| Pair | Foreground | Background | Ratio | Result |
| --- | --- | --- | --- | --- |
| Ink on cream (body, light) | #1F1712 | #FBF7F1 | 16.54 | AA |
| Ink on white (card, light) | #1F1712 | #FFFFFF | 17.65 | AA |
| Secondary text on cream | #6B5F57 | #FBF7F1 | 5.79 | AA |
| Secondary text on white | #6B5F57 | #FFFFFF | 6.18 | AA |
| Amber 600 text on cream | #A8590A | #FBF7F1 | 4.80 | AA |
| Amber 600 text on white | #A8590A | #FFFFFF | 5.12 | AA |
| Amber 700 text on white | #8F4B07 | #FFFFFF | 6.61 | AA |
| Espresso on amber 500 (button) | #2A1A10 | #E8871E | 6.31 | AA |
| White on amber 500 | #FFFFFF | #E8871E | 2.65 | fail, do not use |
| White on espresso | #FFFFFF | #2A1A10 | 16.75 | AA |
| Sky 600 link on white | #2C6BA3 | #FFFFFF | 5.62 | AA |
| Sky 600 link on cream | #2C6BA3 | #FBF7F1 | 5.26 | AA |
| Paper on night bg (dark) | #F5EFE8 | #141110 | 16.46 | AA |
| Paper on night surface | #F5EFE8 | #1E1917 | 15.24 | AA |
| Stone on night bg | #B3A79D | #141110 | 7.99 | AA |
| Stone on night surface | #B3A79D | #1E1917 | 7.40 | AA |
| Amber 300 on night bg | #F5B865 | #141110 | 10.67 | AA |
| Espresso on amber 300 (dark button) | #2A1A10 | #F5B865 | 9.51 | AA |
| Sky 300 on night bg | #8CC3EE | #141110 | 9.98 | AA |
| Success text on white | #1E7A4A | #FFFFFF | 5.33 | AA |
| Warning text on white | #8A5A00 | #FFFFFF | 5.93 | AA |
| Error text on white | #C1272D | #FFFFFF | 5.84 | AA |
| Success on night bg | #6FD39B | #141110 | 10.26 | AA |
| Warning on night bg | #F3C463 | #141110 | 11.53 | AA |
| Error on night bg | #F58A8E | #141110 | 7.97 | AA |
| White on pin Now | #FFFFFF | #1E7A4A | 5.33 | AA |
| Espresso on pin Today | #2A1A10 | #E8871E | 6.31 | AA |
| White on pin Upcoming | #FFFFFF | #4A8FCB | 3.45 | AA for UI components (3:1); pin glyphs are icons, not text |
| White on pin Recurring | #FFFFFF | #7C5CC4 | 5.02 | AA |

Text on glass cannot be pre-verified because the backdrop changes. Rule: text on glass uses ink or paper with the system vibrancy style, and any glass surface that carries text sits over a scrim (`rgba(0,0,0,0.25)` on photos) when the content behind it is a photo.

## 5. Typography

iOS uses **SF Pro** through the system text styles. Liquid Glass, the tab bar, and toolbars expect SF and Dynamic Type; do not ship a custom UI font on iOS. Optional: SF Pro Rounded for the large title on the Feed and for the "I'm going" button, to warm it up.

Web uses **Inter** (Google Fonts, weights 400, 500, 600, 700) with `font-feature-settings: "cv11", "ss01"` for the single-storey a and open digits, which brings it closer to SF. Fallback stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`.

| Style | Size / line | Weight | iOS text style | Where |
| --- | --- | --- | --- | --- |
| Large title | 34 / 41 | 700 | largeTitle | Feed header ("This weekend") |
| Title 1 | 28 / 34 | 700 | title | Event name on detail |
| Title 2 | 22 / 28 | 700 | title2 | Section headers |
| Title 3 | 20 / 25 | 600 | title3 | Card titles |
| Headline | 17 / 22 | 600 | headline | Buttons, list titles |
| Body | 17 / 22 | 400 | body | Descriptions |
| Callout | 16 / 21 | 400 | callout | Card metadata |
| Subheadline | 15 / 20 | 400 | subheadline | Secondary rows |
| Footnote | 13 / 18 | 400 | footnote | Timestamps, source link |
| Caption 1 | 12 / 16 | 500 | caption | Chips, pin labels |
| Caption 2 | 11 / 13 | 500 | caption2 | Tab labels |

Tracking: tighten titles slightly (-0.3 to -0.4pt at 28 to 34pt), leave body at 0. Numbers in dates and distances use tabular figures.

## 6. Iconography

SF Symbols on iOS, rendered in the glass tab bar with the system's hierarchical rendering. On web, use Lucide with 1.5px stroke as the stand-in, matched to SF Symbols' optical weight.

| Slot | Symbol | Notes |
| --- | --- | --- |
| Tab: Feed | `house.fill` / `house` | Selected / unselected |
| Tab: Map | `map.fill` / `map` | |
| Tab: Create | `plus` | Trailing tinted-glass accessory button beside the tab pill |
| Tab: Activity | `bell.fill` / `bell` | Badge for unread |
| Tab: Profile | `person.crop.circle.fill` / `person.crop.circle` | |
| Search | `magnifyingglass` | Bottom search on Map |
| Filters | `line.3.horizontal.decrease.circle` | |
| Date | `calendar` | |
| Time | `clock` | |
| Location | `mappin.and.ellipse` | |
| Directions | `arrow.triangle.turn.up.right.diamond.fill` | |
| Distance | `location` | |
| Host | `person.crop.circle.badge.checkmark` | |
| Going | `checkmark.circle.fill` | RSVP confirmed |
| Not going | `circle` | |
| Recurring | `repeat` | |
| Share | `square.and.arrow.up` | |
| Photos | `photo.on.rectangle` | |
| Camera / check-in | `camera.fill` | |
| Comment | `bubble.left` | |
| Source link | `link` | Opens Evite, Instagram, etc. |
| Import | `link.badge.plus` | Paste-a-link entry |
| Garage | `car.fill` | |
| Follow | `plus.circle` / `checkmark.circle` | |
| Vehicle theme | `car.2.fill` | Filter chip |
| Confidence high | `checkmark.seal.fill` | Import preview |
| Confidence medium | `questionmark.circle.fill` | |
| Confidence low | `exclamationmark.triangle.fill` | |
| List view toggle | `list.bullet` | |
| Map view toggle | `map` | |
| Sign in with Apple | `apple.logo` | |

## 7. Logo

Concept: **cup on wheels.** A coffee cup body reads as a car cabin; two wheels sit under it; two wisps of steam rise from it. The cup's front-left corner is squared like a hood while the rear is rounded like a fender, so the silhouette scans as "vehicle" before "mug". It never spells the name, so it survives a rename.

Properties: single color, works at 16px (favicon) and 1024px (icon), no gradients required, geometric strokes at a constant 4-unit weight on a 64-unit grid.

Files:

| File | Use |
| --- | --- |
| `assets/logo-mark.svg` | Espresso mark on transparent. Light backgrounds. |
| `assets/logo-mark-dark.svg` | Paper mark on transparent. Dark backgrounds. |
| `assets/logo-horizontal.svg` | Mark plus "Cars & Coffee" wordmark, SF Pro / Inter, ampersand in amber. Text is live, not outlined; outline before print. |
| `assets/app-icon-background.svg` | Icon Composer background layer |
| `assets/app-icon-foreground.svg` | Icon Composer foreground layer |
| `assets/app-icon-1024.png` | Flattened App Store icon |
| `assets/social-card-1200x630.png` | Open Graph and iMessage link preview |

Clear space: half the mark's height on all sides. Minimum size: 20px mark, 120px horizontal. Do not add a gradient to the mark, rotate it, or put it inside a circle badge (the icon already does that job).

## 8. Layout and motion under Liquid Glass

Glass is the navigation layer. Content is the world underneath it. Everything in this section follows from that.

**Structure**

| Principle | What it means in practice |
| --- | --- |
| Content edge-to-edge | Photos, map, and lists extend under the tab bar and toolbar. Add `contentInset` at the bottom equal to `tabBarInset` (88pt) or `bottomSearchInset` (156pt) on the Map. |
| Floating tab bar | Native iOS 26 tab bar: a floating glass pill inset 16pt from the bottom with four tabs (Feed, Map, Activity, Profile), plus Create as the trailing tinted-glass accessory button beside the pill. It shrinks on scroll; do not fight that. |
| Bottom search on Map | A glass search field sits above the tab bar (bottom search), because thumbs live at the bottom and the map's top is for the compass and locate button. Tapping expands it into a sheet with filters. |
| Glass toolbar | Top toolbar is glass with SF Symbol buttons only, no solid background. Large titles scroll into the glass. |
| Photo-forward cards | Feed and list cards are 4:3 photo first, with a scrim gradient at the bottom and title over the photo. Metadata (time, distance, host, going count) sits below on the surface color. Corner radius 20. |
| Sheets | Event detail on Map opens as a medium detent sheet (glass), full detent for the whole event. |
| One accent per screen | Amber goes on the one action that matters (I'm going, Post, Paste a link). Everything else is ink and glass. |
| Warm ground | Backgrounds are cream and night, not pure white or black, so glass refracts warmth even over empty areas. |

**Motion**

| Interaction | Behavior |
| --- | --- |
| Tab switch | System glass morph; no custom transition. |
| Card to detail | Matched geometry on the cover photo, 0.4s spring (response 0.4, damping 0.8). |
| Map pin select | Pin scales to 1.2x with a white ring, sheet rises to medium detent, both on the same spring. |
| Bottom search focus | Search field morphs into the sheet header (glass morph), keyboard rises together. |
| RSVP | Button fills amber with a short haptic (`.success`), going-count avatar stack animates in one avatar. |
| Import parsing | Skeleton draft with shimmer, fields populate in reading order as the parser returns, confidence chips fade in last. |
| Pull to refresh | System. |
| Reduce Motion | All custom springs fall back to crossfades. |

## 9. App icon for iOS 26

iOS 26 icons are layered and rendered by the system in light, dark, clear, and tinted appearances. Build the icon in **Icon Composer** from two layers, and keep it simple: glass looks best with one bold shape and one flat ground.

| Layer | File | Content | Composer settings |
| --- | --- | --- | --- |
| Background | `app-icon-background.svg` | Amber morning-light gradient (amber.300 to amber.600) with a soft highlight at top left | No blur, no specular. Provide a flat amber.500 fill as the "tinted" fallback. |
| Foreground | `app-icon-foreground.svg` | The mark in espresso, centered, 800pt on the 1024 canvas | Glass on, specular on, shadow "neutral", translucency low (0.1 to 0.2). |

Guidance:

1. No text in the icon. No rounded-rect background inside the layer; iOS applies the squircle.
2. Keep the mark inside the 88% safe zone (we use 78%) so the glass edge highlight does not clip the wheels.
3. For the dark appearance, Icon Composer darkens the background automatically; check that espresso still separates from it. If not, set the foreground to paper (#F5EFE8) for dark only.
4. Test the "clear" appearance: the mark must read as a silhouette with no color at all. This is why the mark is single-color.
5. Export the flattened 1024 PNG (`app-icon-1024.png`) for App Store Connect and for Expo's `app.json` `icon` field until Expo supports `.icon` bundles directly.

## 10. Open questions for Amir

| Decision | Recommendation | Why it matters |
| --- | --- | --- |
| Amber primary vs sky primary | Amber | Locks pins, buttons, and icon. Changing later touches every asset. |
| Ship name | Keep "Cars and Coffee" through TestFlight, decide before App Store submission | Trademark exposure and search. |
| SF Pro Rounded for large titles | Yes, feed and buttons only | Small warmth gain, zero cost. |
| Pin taxonomy (now, today, upcoming, recurring) | Yes | Drives filter UI and legend. |
| Photo aspect | 4:3 cards, 16:9 detail hero | Most phone car photos are 4:3. |

# ADR 0009: Rebrand to Curb Social Club and the coastal classic direction

Date: 2026-09-05. Status: Accepted (decided by Amir).

## Context

The project was planned under the working title "Cars and Coffee." The market research (`docs/research/market-research.md`, section 3) found that the phrase is the generic name of the event category and that the USPTO treats it as descriptive for event and club services: Cars and Coffee, Inc. holds one live registration (Reg. 4941522, class 025 clothing), its event-services applications 86741281 and 86741282 were refused and abandoned in 2022, and third-party applicants had to disclaim "cars & coffee." Nobody holds a Principal Register mark for the phrase covering events or software, which means nobody could, including us. The practical exposures were an undefendable name that anyone could clone, App Store search crowded with local meets and directories, and a pre-launch national aggregator sitting on carsandcoffee.com.

Separately, the first brand pass (amber primary, espresso ink, a "cup on wheels" mark) was designed to survive a rename but was not designed around a person. Amir's brief for the rebrand named one: young to middle-aged owners of classic Porsches in Newport Beach, wealthy but not flashy, at small early-morning meets under the marine layer. The product principle "easy and useful, not exclusive; meet people where they are" is unchanged and has to coexist with that brand.

Both decisions were due before App Store submission (gaps items 1 and 26 to 30) and are cheaper now, while the repo is docs-only, than after code, a Figma file, and deep links exist.

## Decision

Rename the product to **Curb Social Club** and adopt the quiet coastal classic direction.

| Item | Decision |
|---|---|
| Formal name | Curb Social Club. App Store title, legal entity, wordmark lockup, doc titles |
| Conversational name | Curb Social |
| In-app brand | curb, always lowercase: wordmark, Expo slug, URL scheme `curb://` |
| Category term | "cars and coffee," lowercase, for the events themselves; capitalized only when naming a real event (South OC Cars and Coffee) or in the trademark history |
| Identifiers | Repo `github.com/amirsaifi77/curb-social-club`; root package `curb-social-club`; workspace scope `@curb/*`; Rails app `curb_social_club` (module `CurbSocialClub`, database `curb_social_club_development`); Docker container `curb-postgres`; Expo slug `curb`; bundle id placeholder `club.curbsocial.app`; web domain placeholder `curbsocial.club` (unconfirmed, alternatives `curb.social` and `curbsocialclub.com`) |
| Brand direction | Quiet coastal classic luxury. Overcast early mornings, coffee, wet asphalt. Understated over loud, marine layer over sunshine, editorial over app-store |
| Palette | Flat: solid fills, thin rules, generous whitespace, no gradients, glows, or glossy highlights. Three themes, each with light and dark variants: Marine Layer (default; fog white, overcast grey, wet-asphalt charcoal, muted slate blue, one Lido Blue #0E2A47 accent), Harbor (deep navy, bone white, warm sand, brass or ochre accent), Olive and Ivory (sage-olive, ivory, stone grey, burnt-sienna accent) |
| Type | Instrument Serif (Fraunces alternate) for the wordmark and headlines; Geist (Inter fallback) for UI and body; SF Pro for iOS system chrome under Liquid Glass |
| Marks | Two directions to resolve in gaps item 27: a lowercase "curb" wordmark with one distinctive letterform detail plus a CURB SOCIAL CLUB small-caps lockup, and a curb-profile monogram (step or chamfer cross-section forming a C) that works at 16 px and 1024 px. No car silhouettes, no Porsche references or recognizable model shapes, no coffee-cup cliches. Allowed motifs: coastline, horizon, marine-layer band, curb geometry |
| Voice | Calm, specific, dry. Name the place and the time. No hype, no exclusivity language |
| Audience rule | The brand is a tone, not a velvet rope. Every meet is listed with the same card and the same accuracy; every car is welcome; no marque filters, tiers, or invite codes. Copy must pass two readings: tasteful to the beachhead persona, welcoming to a first-timer in a daily driver |
| Beachhead | Coastal Orange County (Newport Beach, Corona del Mar, Laguna Beach, Dana Point, San Clemente) first, the Inland Empire as the second ring |
| Tooling | Figma Professional (one Full seat); the three themes are variable modes in one collection; brand guide, logos, components, and screens all live in the Figma file, mirrored under `brand/` |
| Trademark | File the composite CURB SOCIAL CLUB, not bare CURB, as an intent-to-use application in classes 009 and 042 after a clearance search |

## Alternatives

| Option | Why not |
|---|---|
| Keep "Cars and Coffee" and file intent-to-use anyway | The 035/041 refusals and the disclaimers on file make a class 009/042 refusal likely; even if granted, the phrase is generic in daily use and cannot be defended. Wastes the filing fee and defers the same rename to after launch, when deep links and listings exist. |
| "Cars & Coffee" plus a distinctive suffix (Meetfinder, Meetline) | Keeps category SEO but reads like a directory, inherits the confusion with carsandcoffee.com, and the ownable part is the weak part of the name. |
| Other short names from the first brand pass (Sunrise Meet, Lot, Idle) | Sunrise Meet is descriptive and sunny where the brand wants overcast. Lot is unsearchable. Idle risks reading as lazy. Curb was already the shortlist favorite: one syllable, automotive, casual, and it names where the cars sit and where people stand. |
| Bare "Curb" as the product name | Curb Mobility holds a live CURB registration (Reg. 4800642) in classes 009, 036, and 039 for taxi software, Curb Records owns curb.com, and many CURB-prefixed marks exist. A bare Curb app in class 009 is the hardest position to clear. The composite name with "Social Club" is distinctive, still lets the in-app brand be "curb," and is the mark we file. |
| A coined word | Strongest legal position, but a coined name needs marketing spend to mean anything, and the brief wanted a name that sounds like a place people already go. |
| Keep the amber identity and only rename | The amber, sunshine, and cup imagery pull against the coastal overcast direction, and the "cup on wheels" mark carries the old name's category cliche. Retiring it is cheaper than reconciling it. |
| Brand for everyone, no persona | A brand aimed at nobody in particular is what the competing car apps have. The persona sets the taste bar and the launch geography; the audience rule above keeps it from becoming a filter. |

## Consequences

Positive: a registrable, distinctive name; App Store search and social handles that can be owned; a brand with a point of view and a person behind it; a launch geography with a credible story (a dense, accurate schedule for a wealthy coastal strip) that travels to other regions; three themes and a flat palette that stand apart from gradient-heavy competitors under Liquid Glass; all of it done before any code, Figma variables, or deep links depended on the old name.

Negative and follow-ups: the coastal seed inventory is thin (about six meets captured) and needs on-the-ground work in Phase 1, so the Inland Empire count will lead early. The "Curb" namespace is crowded, so the clearance search, domain purchase, App Store name reservation, and handle claims are now gating items (gaps items 1 and 2). The brand tone can drift toward exclusivity if unattended; the two-way copy test and gaps item 29 exist to catch that. The first brand pass, the amber Figma file, and the six mockup artboards are superseded and should be retired rather than converted. The local checkout folder is still named `cars-and-coffee` until the remote rename lands; nothing in the repo depends on the folder name. Any mention of "Cars and Coffee" in the docs from here on refers to the event category, a named real-world event, or the trademark history, never to this product.

## Amendments

| Date | Change |
| --- | --- |
| 2026-09-05 | Marine Layer accent settled as Lido Blue #0E2A47 (dark lift #9DC1E4), named for Lido Isle in Newport Beach. The brief's "oxblood or tobacco" option was tried as oxblood in brand guide v2.0 and replaced in v2.1; the cluster pin moved to textSecondary so it reads apart from the navy today pin. See `brand/brand-guide.md` section 14. |

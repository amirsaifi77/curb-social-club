# Curb Social Club: Planning Status (2026-09-05)

Read this first in any new session. It records what exists, where it lives, and what was decided.

## Naming, in one table

| Form | Use |
|---|---|
| Curb Social Club | Formal: App Store title, legal entity, ADRs, doc titles, the small-caps lockup |
| Curb Social | Conversational: prose, press, bios |
| curb | In-app brand, always lowercase: wordmark, Expo slug, URL scheme `curb://` |
| cars and coffee | The event category, lowercase, never the product name. Capitalize only for a named real-world event (South OC Cars and Coffee) |

The product was renamed from the working title "Cars and Coffee" on 2026-09-05 because the phrase is descriptive at the USPTO and undefendable (ADR 0009). The local checkout folder may still be named `cars-and-coffee`; the remote is `github.com/amirsaifi77/curb-social-club`.

## Decisions confirmed by Amir

Rails 8 API-only backend with Postgres and PostGIS; React web; React Native with Expo for mobile, iOS first with Liquid Glass; pnpm workspaces plus Turborepo monorepo; Render (or Fly.io) for the API, Vercel for web, R2 or S3 for media; anonymous browsing with Sign in with Apple and Google for accounts; private repo github.com/amirsaifi77/curb-social-club; solo builder at 10 to 15 hours per week; coastal Orange County beachhead (Newport Beach, Corona del Mar, Laguna, Dana Point, San Clemente) with the Inland Empire as the second ring; pluggable importer starting with Evite; monetization deferred.

Brand (2026-09-05): quiet coastal classic luxury. Beachhead persona is the young to middle-aged classic Porsche owner in Newport Beach, wealthy but not flashy. Flat palette, no gradients or glows. Three themes, each with light and dark variants: Marine Layer (default; accent Lido Blue #0E2A47, lifted to #9DC1E4 in dark, brand guide v2.1), Harbor, Olive and Ivory. Editorial serif (Instrument Serif, Fraunces alternate) for wordmark and headlines, grotesk (Geist, Inter fallback) for UI and body, SF Pro for iOS system chrome. Two mark directions under review: a lowercase "curb" wordmark with a CURB SOCIAL CLUB small-caps lockup, and a curb-profile monogram. No car silhouettes, no Porsche references, no coffee-cup cliches. The product principle "not exclusive, meet people where they are" stands: the brand is a tone, not a velvet rope.

## Where things live

| Thing | Location |
|---|---|
| Monorepo skeleton (docs and config only) | GitHub: https://github.com/amirsaifi77/curb-social-club (renamed from cars-and-coffee; three commits on main plus the uncommitted rebrand) |
| Plans, research, open questions | `docs/` in the repo; mirrored in the claude.ai project |
| Brand guide, tokens, logos, icons, canvas, previews | `brand/` in the repo (`brand-guide.md`, `tokens.json`, `logos/`, `icons/`, `canvas/`, `previews/`, `work/`, `brand-sheet.png`); tokens consumed by apps from `packages/design-tokens/tokens.json` |
| Working brand files during the rebrand | `/home/claude/cac/brand-v2/` (planning workspace, not the repo); `/home/claude/cac/brand/` is the superseded amber identity |
| Figma file "Curb Social Club" | https://www.figma.com/design/aRyM1JhTPCIhMpPLX051T9 (Figma Professional). Pages: Cover, Brand Guide (8 frames), Foundations (Theme collection with 6 modes: Marine Layer, Harbor, Olive and Ivory, each Light and Dark), Components, iOS Screens (5 screens plus Feed in each theme), Web, Assets. The old amber file (https://www.figma.com/design/68kmmZuZQ2jrAWYu7vtVIe) is superseded |
| Design canvas "Curb Social Club Design Canvas" | https://claude.ai/code/artifact/b3bc82aa-c60f-4cef-91e4-e28b1c51ab9a (Feed, Map, List, Event detail, Create from link, Theme comparison, Web landing, Brand board). The amber-era canvas (https://claude.ai/code/artifact/00be4ff6-39cc-4033-aaa0-df0f21debb3e) is superseded |
| Open decisions | `docs/gaps-and-open-questions.md` (item 1 name and item 31 Figma are resolved; items 26 to 29 are the open brand decisions) |
| Rebrand record | `docs/adr/0009-rebrand-to-curb-social-club.md` |

## Identifiers

| Identifier | Value | Status |
|---|---|---|
| Root package | `curb-social-club`; workspace scope `@curb/*` | Set |
| Rails app | `rails new api --name=curb_social_club`, module `CurbSocialClub`, databases `curb_social_club_{development,test,production}` | Documented, not generated |
| Docker | container `curb-postgres`, user `curb`, volume `curb-pgdata` | Set |
| Expo | name and slug `curb`, scheme `curb://` | Documented, not generated |
| iOS bundle id | `club.curbsocial.app` | Placeholder until the domain is confirmed |
| Web domain | `curbsocial.club` (alternatives `curb.social`, `curbsocialclub.com`) | Unconfirmed |
| Social handles | `@curbsocialclub` | Not yet claimed |
| Trademark | CURB SOCIAL CLUB, classes 009 and 042, intent-to-use | Clearance search and filing pending |

## Workstream outputs

Market research: no app owns the category; discovery is Instagram first; the old name was descriptive at the USPTO and hard to defend (now moot); about 70 SoCal meets captured as seed data, of which about 11 are in Orange County and 6 on the coastal strip, so coastal seeding needs on-the-ground work; Evite, Partiful, and Meta prohibit scraping, so the importer is paste-or-share text plus LLM extraction, with Eventbrite as the only official API.

Mobile: Expo SDK 57 now, SDK 58 as soon as it is stable (Xcode 27 requirement); expo-router native tabs, native stack glass headers, expo-glass-effect sparingly; react-native-maps on Apple Maps with supercluster; Unistyles consuming a shared tokens package with three themes in light and dark.

Architecture: ADRs 0001 to 0009 in the repo; React Router v7 (Proposed) and Render (Proposed) are the two still open.

Brand: rebranded to Curb Social Club with the coastal classic direction above. The amber "cup on wheels" identity is retired. The Curb namespace was checked (Curb Mobility taxi app with a live class 009 CURB mark, Curb Records, Curb energy monitor, Curbed); none block a composite CURB SOCIAL CLUB mark, details in the business plan risk table.

## Next steps

1. Decide the open brand items 26 to 29 and the two architecture items 18 and 19 in `docs/gaps-and-open-questions.md`.
2. Check domain availability for `curbsocial.club`, `curb.social`, and `curbsocialclub.com`; claim `@curbsocialclub` handles; reserve the App Store name.
3. Run the CURB SOCIAL CLUB clearance search and file the intent-to-use application in classes 009 and 042.
4. Start Phase 0 from `docs/development-plan.md` ("first 10 Claude Code sessions"), including theme switching and the flat-rendering design QA.
5. Revoke the GitHub token used during planning; it was pasted in chat and is no longer needed.

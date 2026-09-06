# Curb Social Club: Planning Status (2026-09-06)

Read this first in any new session. It records what exists, where it lives, and what was decided. Updated 2026-09-06 (evening) for the execution-ready doc set: feature specs, screen inventory, session prompts, and the scope decisions in ADR 0010 and 0011.

## Naming, in one table

| Form | Use |
|---|---|
| Curb Social Club | Formal: App Store title, legal entity, ADRs, doc titles, the small-caps lockup |
| Curb Social | Conversational: prose, press, bios |
| curb | In-app brand, always lowercase: wordmark, Expo slug, URL scheme `curb://` |
| cars and coffee | The event category, lowercase, never the product name. Capitalize only for a named real-world event (South OC Cars and Coffee) |

The product was renamed from the working title "Cars and Coffee" on 2026-09-05 because the phrase is descriptive at the USPTO and undefendable (ADR 0009). The local clone lives at `~/Documents/Curb/curb-social-club`; the remote is `github.com/amirsaifi77/curb-social-club`.

## Decisions confirmed by Amir

Scope and format (2026-09-06): an event's host is a user, a club, or a sponsor (ADR 0010); every host type is followable; clubs and sponsors ship as seeded, read-only pages at launch with membership, invites, and self-service after launch (Phase 7); clubs and sponsors are managed through an admin-only Rails UI at launch and the public web stays read-only; user profiles are viewable by anyone and carry photos, connected socials (display-only handles), and club memberships; the feed is sectioned and carries events, photos, clubs, sponsors, and spots; photos come from the Photos picker, and Instagram posts come through the iOS share sheet rendered by oEmbed with the image never stored (ADR 0011); Instagram Login is post-launch; photo locations are first-class spots with a pin, a page, a map layer, and opt-in tagging. Launch target moves from May to June 2027 unless spots pages and Instagram posts are held to post-launch (`docs/development-plan.md`, "Holding May").

Rails 8 API-only backend with Postgres and PostGIS; React web; React Native with Expo for mobile, iOS first with Liquid Glass; pnpm workspaces plus Turborepo monorepo; Render (or Fly.io) for the API, Vercel for web, R2 or S3 for media; anonymous browsing with Sign in with Apple and Google for accounts; private repo github.com/amirsaifi77/curb-social-club; solo builder at 10 to 15 hours per week; coastal Orange County beachhead (Newport Beach, Corona del Mar, Laguna, Dana Point, San Clemente) with the Inland Empire as the second ring; pluggable importer starting with Evite; monetization deferred.

Brand (2026-09-05): quiet coastal classic luxury. Beachhead persona is the young to middle-aged classic Porsche owner in Newport Beach, wealthy but not flashy. Flat palette, no gradients or glows. Three themes, each with light and dark variants: Marine Layer (default; accent Lido Blue #0E2A47, lifted to #9DC1E4 in dark, brand guide v2.1), Harbor, Olive and Ivory. Editorial serif (Instrument Serif, Fraunces alternate) for wordmark and headlines, grotesk (Geist, Inter fallback) for UI and body, SF Pro for iOS system chrome. Two mark directions under review: a lowercase "curb" wordmark with a CURB SOCIAL CLUB small-caps lockup, and a curb-profile monogram. No car silhouettes, no Porsche references, no coffee-cup cliches. The product principle "not exclusive, meet people where they are" stands: the brand is a tone, not a velvet rope.

## Where things live

| Thing | Location |
|---|---|
| Monorepo skeleton (docs and config only) | GitHub: https://github.com/amirsaifi77/curb-social-club (renamed from cars-and-coffee; rebrand, Lido Blue accent, and primary CTA spec are committed on main). Local clone: `~/Documents/Curb/curb-social-club` |
| Vercel project | https://vercel.com/amirsaifi77/curb-social-club (project `curb-social-club`, Node 24.x). Git deployments are disabled by the root `vercel.json` (added 2026-09-06) because every build failed at `pnpm install`: with no lockfile in the repo yet, Vercel fell back to pnpm 6, which `engines.pnpm >=9` rejects. Session 0.8 replaces that file with real project settings once `apps/web` exists |
| Feature specs (the unit a session builds from) | `docs/specs/` (16 specs plus `README.md` index and `_template.md`), mirrored in the claude.ai project |
| Screen inventory | `docs/screens.md` (S01 to S41, W01 to W17, A01 to A12) |
| Session prompts | `docs/sessions.md` (preamble, template, Phase 0 sessions 0.1 to 0.10, Phase 1 sessions 1.1 to 1.17) |
| Plans, research, open questions | `docs/` in the repo; mirrored in the claude.ai project |
| Brand guide, tokens, logos, icons, canvas, previews | `brand/` in the repo (`brand-guide.md`, `tokens.json`, `logos/`, `icons/`, `canvas/`, `previews/`, `work/`, `brand-sheet.png`); tokens consumed by apps from `packages/design-tokens/tokens.json` |
| Session output | Always inside the repo clone, so it can be committed. The parent folder `~/Documents/Curb/` holds only the repo clone (loose drafts and superseded exports were removed 2026-09-06); nothing is written there |
| Figma file "Curb Social Club" | https://www.figma.com/design/aRyM1JhTPCIhMpPLX051T9 (Figma Professional). Pages: Cover, Brand Guide (8 frames), Foundations (Theme collection with 6 modes: Marine Layer, Harbor, Olive and Ivory, each Light and Dark), Components, iOS Screens (5 screens plus Feed in each theme), Web, Assets. The old amber file (https://www.figma.com/design/68kmmZuZQ2jrAWYu7vtVIe) is superseded |
| Design canvas "Curb Social Club Design Canvas" | https://claude.ai/code/artifact/b3bc82aa-c60f-4cef-91e4-e28b1c51ab9a (Feed, Map, List, Event detail, Create from link, Theme comparison, Web landing, Brand board). The amber-era canvas (https://claude.ai/code/artifact/00be4ff6-39cc-4033-aaa0-df0f21debb3e) is superseded |
| Open decisions | `docs/gaps-and-open-questions.md` (items 1, 10, 14, 31 resolved; 4, 5, 11, 23 adopted into specs; 26 to 29 are the open brand decisions; 35 to 39 added 2026-09-06) |
| Rebrand record | `docs/adr/0009-rebrand-to-curb-social-club.md` |
| Host types, clubs, sponsors | `docs/adr/0010-host-types-clubs-sponsors.md` |
| Instagram media policy | `docs/adr/0011-external-media-instagram.md` |

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

Architecture: ADRs 0001 to 0011 in the repo; React Router v7 (Proposed) and Render (Proposed) are the two still open and are accepted or replaced in sessions 0.8 and 1.16. Data model v0.3 and API v0.3 carry the polymorphic host, clubs, memberships, sponsors, sponsorships, claim requests, spots, external media, admin audits, cadence, decay, and the sectioned feed.

Execution docs (2026-09-06): 16 feature specs in `docs/specs/` following one template (user stories, numbered requirements, data and API references, screens and states, copy, acceptance criteria, verification, session slices); `docs/screens.md`; `docs/sessions.md` with 27 fully written prompts for Phases 0 and 1; `CLAUDE.md` rewritten with the session workflow and the new rules. Every spec is `draft` until Amir reviews it.

Brand: rebranded to Curb Social Club with the coastal classic direction above. The amber "cup on wheels" identity is retired. The Curb namespace was checked (Curb Mobility taxi app with a live class 009 CURB mark, Curb Records, Curb energy monitor, Curbed); none block a composite CURB SOCIAL CLUB mark, details in the business plan risk table.

## Next steps

1. Review the 2026-09-06 doc set and commit it: read `docs/specs/README.md`, skim two or three specs, then `docs/sessions.md`. Move each spec from `draft` to `ready` as it is reviewed. Judgment calls to confirm or change are listed at the end of `docs/gaps-and-open-questions.md`.
2. Start Phase 0 with session 0.1 in `docs/sessions.md` (paste the preamble, then the session block).
3. Decide the open brand items 26 to 29 and the two architecture items 18 and 19 in `docs/gaps-and-open-questions.md`; items 18 and 19 close in sessions 0.8 and 1.16.
4. Check domain availability for `curbsocial.club`, `curb.social`, and `curbsocialclub.com`; claim `@curbsocialclub` handles; reserve the App Store name. Universal Links sessions (1.14, 1.17) are blocked on the domain.
5. Run the CURB SOCIAL CLUB clearance search and file the intent-to-use application in classes 009 and 042.
6. Create the Meta app and request the oEmbed Read feature at the start of Phase 3 (gaps item 36).
7. Revoke the GitHub token used during planning; it was pasted in chat and is no longer needed.

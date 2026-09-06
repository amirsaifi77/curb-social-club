# Feature Specs

One requirement spec per feature domain. A spec is the unit a Claude Code session builds from: it names the tables, endpoints, screens, states, copy, and acceptance criteria for one area, and it slices itself into sessions. `docs/sessions.md` turns those slices into prompts. `docs/screens.md` is the screen inventory the specs cite by id. `docs/data-model.md` and `docs/api.md` are the shared contracts the specs point at rather than repeat.

## How a session uses a spec

1. Read `CLAUDE.md`, then the spec named in the session prompt, then the data model and API sections it cites.
2. Build only the slice the prompt names. Requirements outside the slice are context, not work.
3. Every acceptance criterion for the slice passes before the PR opens. The PR description lists the AC ids and how each was checked.
4. If the spec is wrong or silent, fix the spec in the same PR and say so in the PR description. Specs are living documents; the code and the spec must agree at merge.
5. Do not change status past `draft` unless you are the builder.

## Status vocabulary

| Status | Meaning |
|---|---|
| draft | Written, not yet reviewed by the builder |
| ready | Reviewed; sessions can start |
| building | At least one slice merged |
| shipped | Every slice merged and verified on device |

## Index

Phases are from `docs/development-plan.md`. "Launch" means TestFlight beta and App Store submission; "Post-launch" is Phase 7.

| Spec | Covers | Phase | Status |
|---|---|---|---|
| [design-system-and-theming.md](design-system-and-theming.md) | Design tokens package, three themes in light and dark, theme switching, Liquid Glass chrome rules, flat rendering QA, primary CTA states | 0 | draft |
| [auth-and-accounts.md](auth-and-accounts.md) | Sign in with Apple and Google, anonymous sessions and devices, account deletion, settings screen | 0 | draft |
| [events-and-occurrences.md](events-and-occurrences.md) | Event, Venue, Occurrence, recurrence and materializer, polymorphic host, host name denormalization, confirmation and seed decay | 1 | draft |
| [discovery.md](discovery.md) | Onboarding, Feed sections, Map with layers, List, Search | 1 (spots layer 4) | draft |
| [event-detail-and-rsvp.md](event-detail-and-rsvp.md) | Event detail, occurrence detail, directions, share and story card, RSVP, going list, sponsor block, source attribution | 1 (RSVP 2) | draft |
| [clubs.md](clubs.md) | Club pages, members, club as host, follow a club; membership, invites, and management post-launch | 1 (management 7) | draft |
| [sponsors.md](sponsors.md) | Sponsor pages, sponsor as host, event sponsorships, follow a sponsor; self-service post-launch | 1 (self-service 7) | draft |
| [admin.md](admin.md) | Admin sign-in, CRUD for venues, events, clubs, sponsors, spots, users; CSV seed import; claim review; moderation queue | 1 (queue 2) | draft |
| [web.md](web.md) | Public web: home, city, event, profile, club, sponsor, spot, post pages; OG cards; sitemap; AASA; legal pages | 1 | draft |
| [profiles-and-follow.md](profiles-and-follow.md) | Public profiles with connected socials, garage, clubs section; edit profile; follow users, clubs, sponsors, events; block | 2 | draft |
| [create-and-host-tools.md](create-and-host-tools.md) | Manual create and edit, recurrence and exceptions, cancel an occurrence, claim a meet, host controls | 2 | draft |
| [import-from-link.md](import-from-link.md) | Paste a link or share it, adapters, LLM extraction, draft editor with confidence, publish, eval set | 3 | draft |
| [photos-and-posts.md](photos-and-posts.md) | Photo posts from the Photos picker, Instagram posts from the share sheet via oEmbed, post detail, comments, event photo grid | 4 | draft |
| [spots.md](spots.md) | Photo locations: tag a spot on a photo, create or pick a spot, spot page, spots layer on the map, spot directory on web | 4 | draft |
| [notifications.md](notifications.md) | Push registration, RSVP reminders, cancellations, follow-based notifications, weekly digest, inbox, preferences | 2 (inbox and digest 4) | draft |
| [moderation-and-safety.md](moderation-and-safety.md) | Report on every content type, block, auto-hide, image safety filter, community guidelines, App Review requirements | 2 (image filter 4) | draft |

## Conventions shared by every spec

- Roles: browser (no account), member (signed in), host (user host of an event, or an owner or admin of the hosting club), club manager (owner or admin membership), admin (platform admin or moderator).
- States: every screen defines loading (skeleton matching the final layout), empty, error (inline with retry, chrome stays), offline (cached content or a disabled action with a reason), and signed-out (a gated action opens the sign-in sheet and completes the action afterward).
- Copy: calm, specific, dry, sentence case. Name the place and the time. No hype words, no exclusivity language. "cars and coffee" stays lowercase; the product is "curb" in the app.
- Rendering: flat under Liquid Glass. Solid theme fills and thin rules on content; glass only on system chrome (tab bar, headers, floating map controls, sheets).
- Anonymous read: every public read endpoint works without a token.
- Hosts: one `Host` shape (`type`, `id`, `slug`, `name`, `avatar_url`, `verified`, `kind`) everywhere a host appears; clients branch on `type` only for the link target.
- External media: Instagram images are never stored; embeds come from oEmbed and degrade to an unavailable card.

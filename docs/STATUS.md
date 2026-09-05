# Cars and Coffee: Planning Status (2026-09-05)

Read this first in any new session. It records what exists, where it lives, and what was decided.

## Decisions confirmed by Amir

Rails 8 API-only backend with Postgres and PostGIS; React web; React Native with Expo for mobile, iOS first with Liquid Glass; pnpm workspaces plus Turborepo monorepo; Render (or Fly.io) for the API, Vercel for web, R2 or S3 for media; anonymous browsing with Sign in with Apple and Google for accounts; private repo github.com/amirsaifi77/cars-and-coffee; solo builder at 10 to 15 hours per week; Inland Empire and SoCal launch; pluggable importer starting with Evite; monetization deferred.

## Where things live

| Thing | Location |
|---|---|
| Monorepo skeleton (docs and config only, two commits on main) | GitHub: https://github.com/amirsaifi77/cars-and-coffee (pushed 2026-09-05) |
| Plans, research, brand guide | This project under docs/, research/, brand/; also in the repo under docs/ and brand/ |
| Design canvas (six mockup artboards) | https://claude.ai/code/artifact/00be4ff6-39cc-4033-aaa0-df0f21debb3e |
| Figma file (Foundations and icons done, screens scripted) | https://www.figma.com/design/68kmmZuZQ2jrAWYu7vtVIe |
| Open decisions | docs/gaps-and-open-questions.md |

## Workstream outputs

Market research: no app owns the category; discovery is Instagram first; the name is descriptive at the USPTO and hard to defend; ~70 SoCal meets captured as seed data; Evite, Partiful, and Meta prohibit scraping, so the importer is paste-or-share text plus LLM extraction, with Eventbrite as the only official API.

Mobile: Expo SDK 57 now, SDK 58 as soon as it is stable (Xcode 27 requirement); expo-router native tabs, native stack glass headers, expo-glass-effect sparingly; react-native-maps on Apple Maps with supercluster; Unistyles consuming a shared tokens package.

Architecture: ADRs 0001 to 0008 in the repo; React Router v7 (Proposed) and Render (Proposed) are the two still open.

Brand: amber primary (#E8871E) with espresso ink (#2A1A10), sky secondary, "cup on wheels" logo mark, tokens.json shared by web and mobile.

## Next steps

1. Decide the open items in docs/gaps-and-open-questions.md, at minimum items 1, 18, 19.
2. Start Phase 0 from docs/development-plan.md ("first 10 Claude Code sessions").
3. Revoke the GitHub token used during planning; it was pasted in chat and is no longer needed.

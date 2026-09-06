# Curb Social Club Docs

Planning documents for the Curb Social Club platform (Curb Social in prose, "curb" in the app; the working title was Cars and Coffee until 2026-09-05, see ADR 0009). Start with `STATUS.md`, then the architecture doc, then the ADRs for the reasoning behind each choice.

| Doc | What it covers | Owner |
|---|---|---|
| [STATUS.md](STATUS.md) | Entry point for any session: what exists, what was decided, what is next | All |
| [architecture.md](architecture.md) | System overview, monorepo layout, backend, web, mobile summary, shared packages, CI/CD, security | Architecture workstream |
| [data-model.md](data-model.md) | ERD, every table and column, indexes, retention | Architecture workstream |
| [api.md](api.md) | REST v1 conventions and endpoint reference draft | Architecture workstream |
| [importer.md](importer.md) | Link and flyer import pipeline, adapters, confidence, LLM fallback | Architecture workstream |
| [local-development.md](local-development.md) | Planned local setup and commands | Architecture workstream |
| [mobile-liquid-glass.md](mobile-liquid-glass.md) | iOS 26 Liquid Glass design language and how to achieve it in Expo, plus the mobile architecture | Mobile workstream |
| [business-plan.md](business-plan.md) | Project proposal and business plan, brand direction, personas, go-to-market, metrics, risks (including the Curb namespace), budget | Product workstream |
| [app-overview.md](app-overview.md) | Functional overview of every surface, the import-from-link flow, copy examples, MVP cut list | Product workstream |
| [development-plan.md](development-plan.md) | Phased plan for a solo builder, milestones from October 2026, first Claude Code sessions | Product workstream |
| [components/primary-cta.md](components/primary-cta.md) | Primary CTA states, motion, timings, haptics, long-running variant, implementation notes | Design workstream |
| [gaps-and-open-questions.md](gaps-and-open-questions.md) | Every open decision across workstreams with a suggested default; resolved items keep their number | All |
| [research/market-research.md](research/market-research.md) | How meets are organized today, competitors, trademark records for the old name, SoCal seed inventory (section 4), import feasibility | Research workstream |
| [research/market-summary.md](research/market-summary.md) | One-page summary of the research | Research workstream |
| [../brand/brand-guide.md](../brand/brand-guide.md) | Brand guide: name and voice, the three flat themes (Marine Layer, Harbor, Olive and Ivory) in light and dark, type (Instrument Serif plus Geist), logo directions, Liquid Glass layout rules | Brand workstream |
| [../brand/](../brand/) | `tokens.json` (mirrored to `packages/design-tokens/`), `logos/` (wordmark, lockup, monogram), `icons/` (app icon layers, favicon), `previews/` (screen renders per theme), `figma/` (file link and scripts) | Brand workstream |
| [adr/](adr/) | Architecture decision records | All |

## ADRs

| ADR | Title | Status |
|---|---|---|
| [0001](adr/0001-monorepo-tooling.md) | Monorepo with pnpm workspaces and Turborepo | Accepted |
| [0002](adr/0002-rails-api-only.md) | Rails 8 API-only backend with Solid Queue and Solid Cache | Accepted |
| [0003](adr/0003-postgis-geo.md) | PostGIS geography with materialized occurrences | Accepted |
| [0004](adr/0004-expo-react-native.md) | Expo and React Native for mobile | Accepted |
| [0005](adr/0005-web-framework.md) | React Router v7 framework mode over Next.js | Proposed |
| [0006](adr/0006-auth-strategy.md) | Apple and Google sign-in with opaque session tokens | Accepted |
| [0007](adr/0007-importer-architecture.md) | Pluggable importer with LLM fallback | Accepted |
| [0008](adr/0008-hosting.md) | Render for API and Postgres, Vercel for web, R2 for media | Proposed |
| [0009](adr/0009-rebrand-to-curb-social-club.md) | Rebrand to Curb Social Club and the coastal classic direction | Accepted |

## Writing an ADR

Copy the structure of an existing ADR: Context, Decision, Alternatives (table), Consequences. Number sequentially. Status is one of Proposed, Accepted, Superseded (link to the replacement). Keep prose concise and do not use em dashes.

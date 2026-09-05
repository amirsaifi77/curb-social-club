# Cars and Coffee Docs

Planning documents for the Cars and Coffee platform. Start with the architecture doc, then the ADRs for the reasoning behind each choice.

| Doc | What it covers | Owner |
|---|---|---|
| [architecture.md](architecture.md) | System overview, monorepo layout, backend, web, mobile summary, shared packages, CI/CD, security | Architecture workstream |
| [data-model.md](data-model.md) | ERD, every table and column, indexes, retention | Architecture workstream |
| [api.md](api.md) | REST v1 conventions and endpoint reference draft | Architecture workstream |
| [importer.md](importer.md) | Link and flyer import pipeline, adapters, confidence, LLM fallback | Architecture workstream |
| [local-development.md](local-development.md) | Planned local setup and commands | Architecture workstream |
| [mobile-liquid-glass.md](mobile-liquid-glass.md) | iOS 26 Liquid Glass design language and how to achieve it in Expo, plus the mobile architecture | Mobile workstream |
| [business-plan.md](business-plan.md) | Project proposal and business plan, personas, go-to-market, metrics, risks, budget | Product workstream |
| [app-overview.md](app-overview.md) | Functional overview of every surface, the import-from-link flow, MVP cut list | Product workstream |
| [development-plan.md](development-plan.md) | Phased plan for a solo builder, milestones from October 2026, first Claude Code sessions | Product workstream |
| [gaps-and-open-questions.md](gaps-and-open-questions.md) | Every open decision across workstreams with a suggested default | All |
| [research/market-research.md](research/market-research.md) | How meets are organized today, competitors, trademark, SoCal seed inventory, import feasibility | Research workstream |
| [research/market-summary.md](research/market-summary.md) | One-page summary of the research | Research workstream |
| [../brand/brand-guide.md](../brand/brand-guide.md) | Palette, type, voice, logo, Liquid Glass layout rules | Brand workstream |
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

## Writing an ADR

Copy the structure of an existing ADR: Context, Decision, Alternatives (table), Consequences. Number sequentially. Status is one of Proposed, Accepted, Superseded (link to the replacement). Keep prose concise and do not use em dashes.

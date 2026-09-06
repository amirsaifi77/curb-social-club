# Spec: <Feature name>

Status: draft. Phase: <0 to 7>. Last updated: <YYYY-MM-DD>.
Depends on: <other spec files, or none>. Related decisions: <ADR numbers, gaps items>.

Copy this file to `docs/specs/<kebab-name>.md`. Delete the guidance in angle brackets. Keep every section, even when it only says "None". Status moves draft, ready, building, shipped; only the builder moves it past draft.

## Summary

<Two or three sentences: what this feature is, who it serves, and which product principle it upholds (browse without an account, meet people where they are, calm and specific copy, flat rendering). No history, no alternatives; those live in ADRs.>

## User stories

<Three to eight. Each has an id so requirements and acceptance criteria can cite it.>

| Id | Story |
|---|---|
| US-1 | As a <role>, I want <capability> so that <outcome>. |

Roles used across specs: browser (no account), member (signed in), host (the user host of an event, or an owner or admin of the hosting club), club manager (owner or admin membership), admin (platform admin or moderator).

## Scope

In this phase: <the bounded list of what ships>.

Not in this phase: <each excluded item and where it lives: another spec, a later phase, or "never">.

## Requirements

<Numbered R-1 to R-n, one sentence each, testable, using MUST or SHOULD. Group by area with a bold label. Cite user stories in parentheses. A requirement that cannot be verified by a test or a manual step is not a requirement; move it to Summary.>

**Data**

- R-1 <...> (US-1)

**API**

- R-2 <...>

**Mobile**

- R-3 <...>

**Web**

- R-4 <...>

**Admin and jobs**

- R-5 <...>

## Data

<Tables and columns this feature reads or writes, by name, pointing at `docs/data-model.md`. List only what matters here. Note any migration this spec introduces.>

## API

<Endpoints this feature uses or adds, by method and path, pointing at `docs/api.md`. Include request and response deltas that are specific to this spec.>

## Screens and states

<One row per screen from `docs/screens.md`. States: loading, empty, error, offline, signed-out (an action that needs an account), plus any feature-specific state. Every state named here needs copy below.>

| Screen id | Screen | Route (mobile / web) | Primary actions | States |
|---|---|---|---|---|
| S00 | <name> | `<expo route>` / `<web path>` | <actions> | loading, empty, error, offline |

## Copy

<Exact strings in the brand voice: calm, specific, dry, sentence case, name the place and the time. Include every empty state, error, and CTA label named above. "cars and coffee" stays lowercase; the product is "curb" in the app.>

| Where | String |
|---|---|
| <screen, state> | <text> |

## Acceptance criteria

<Numbered AC-1 to AC-n in Given, When, Then form. Each cites the requirements it proves. Each must be checkable by an automated test or a listed manual step. The session is not done until every AC for its slice passes.>

| Id | Given | When | Then | Proves |
|---|---|---|---|---|
| AC-1 | <state> | <action> | <observable result> | R-1 |

## Verification

<How a session proves the ACs: the test commands to run (request specs, model specs, Vitest, Maestro flow names), manual checks on a physical iPhone (which theme, which state), and what to compare against in Figma or `brand/previews/`.>

| Check | How |
|---|---|
| API | `pnpm --filter @curb/api test spec/requests/api/v1/<file>_spec.rb` |
| Mobile | <Maestro flow or manual steps> |
| Design | <Figma frame or preview file> |

## Risks and open questions

<Anything unresolved, with its number in `docs/gaps-and-open-questions.md` when one exists, and the default the spec assumes.>

## Session breakdown

<How this spec slices into Claude Code sessions of two to three hours each. Each slice names its deliverable, the requirements it covers, and the ACs that must pass. `docs/sessions.md` turns these into full prompts.>

| Slice | Deliverable | Covers | Must pass |
|---|---|---|---|
| 1 | <...> | R-1, R-2 | AC-1 |

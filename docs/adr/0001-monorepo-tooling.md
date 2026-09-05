# ADR 0001: Monorepo with pnpm workspaces and Turborepo

Date: 2026-09-05. Status: Accepted.

## Context

Three applications (Rails API, React web, Expo mobile) share TypeScript types generated from one OpenAPI spec, one design token source, and one API client. A solo builder working nights needs one clone, one CI, and one place to make a cross-cutting change. Two of the apps are JavaScript; one is Ruby.

## Decision

One private repository `cars-and-coffee` using pnpm workspaces for JavaScript packages and Turborepo for task orchestration and caching. The Rails app lives at `apps/api` as a workspace package with a `package.json` containing only scripts that wrap `bundle`, `rspec`, and `rubocop`, so Turborepo can run and cache it while pnpm installs nothing for it.

Workspace packages are scoped `@cac/*`. Shared TypeScript lives in `packages/`. Root `turbo.json` defines `build`, `dev`, `lint`, `test`, `typecheck`, `openapi`, and `generate` tasks; `apps/api/turbo.json` narrows inputs to Ruby files.

## Alternatives

| Option | Why not |
|---|---|
| Separate repos per app | Types drift, three CIs, cross-cutting changes need three PRs. |
| Nx | More features than needed, heavier config, plugin model adds learning. Turborepo is enough for task graphs and caching. |
| npm or yarn workspaces | pnpm is faster, strict about phantom dependencies, and the Expo and Vite ecosystems support it well. |
| Rails outside the workspace, run by Make | Loses one-command `pnpm test` and cache; two mental models. |

## Consequences

Positive: single `pnpm install`, `pnpm test`, and `pnpm build`. Generated types flow through Turborepo's dependency graph. Cross-app refactors are one PR.

Negative: contributors need both Node and Ruby toolchains. Turborepo caching of Ruby tasks needs correct input globs or it silently skips tests; api `test` is `cache: false` until trusted. Expo's Metro bundler needs `node-linker` considerations with pnpm (documented in the mobile README; `.npmrc` sets `node-linker=hoisted` for the mobile app if Metro symlink resolution misbehaves).

# Contributing

This is a private, single-maintainer project today. These rules exist so that Claude Code sessions and any future collaborator work the same way.

## Branches and merges

| Rule | Detail |
|---|---|
| Default branch | `main`, protected, CI required |
| Feature branches | `feat/<short-name>`, `fix/<short-name>`, `chore/<short-name>`, `docs/<short-name>` |
| Merge strategy | Squash merge. The PR title becomes the commit message, so write it as a Conventional Commit. |
| Releases | Mobile: tag `mobile-vX.Y.Z` triggers EAS build and TestFlight submit. Web and API: deploy from `main`. |

## Commits

Conventional Commits: `type(scope): summary`.

| Type | Use |
|---|---|
| `feat` | New user-facing capability |
| `fix` | Bug fix |
| `chore` | Tooling, deps, config |
| `docs` | Documentation only |
| `refactor` | No behavior change |
| `test` | Tests only |

Scopes: `api`, `web`, `mobile`, `types`, `api-client`, `tokens`, `ui`, `config`, `ci`, `docs`. Omit the scope for repo-wide changes.

No changesets. Nothing is published to npm. App versions are bumped by hand.

## Pull requests

Fill in the template. Keep PRs focused; a schema change and its API endpoint can share a PR, a schema change plus a mobile screen should not. Regenerate `packages/types` when the OpenAPI spec changes and commit the output. Screenshots or a short recording for any UI change.

## Code style

| Area | Tool |
|---|---|
| Ruby | rubocop-rails-omakase plus rubocop-rspec (`pnpm --filter @cac/api lint`) |
| TypeScript | eslint and prettier from `@cac/config` (`pnpm lint`, `pnpm format`) |
| Markdown | Concise prose, headers, tables where they help. No em dashes; use commas, periods, or parentheses. |
| Commits and docs | Plain language, no emoji. |

## Tests

| App | Expectation |
|---|---|
| api | Request specs for every endpoint (they generate the OpenAPI spec), model specs for validations and scopes, job specs for importer adapters with VCR cassettes |
| web | Vitest for loaders and utilities, Playwright smoke test for the event page once it exists |
| mobile | Jest with `jest-expo` for hooks and utilities, Maestro flows later |
| packages | Vitest |

## Security

Report anything sensitive directly to the maintainer rather than in a public issue. Never commit `.env` files or credentials. Importer adapters must not fetch authenticated pages or crawl beyond the pasted URL.

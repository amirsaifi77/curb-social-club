# tooling

Repo-level scripts that do not belong to one app.

| Script | Purpose |
|---|---|
| `check-em-dashes.sh` | Fails if any Markdown file contains an em dash (also run in CI) |
| `render-fixture-images.mjs` | Draws the placeholder pictures `bin/rails seeds:dev` attaches to the fabricated rows, into `apps/api/db/seeds/dev/images/` (committed). Uses the Chromium `apps/web` already depends on, so `pnpm install` is the only setup |

Planned:

| Script | Purpose |
|---|---|
| `openapi-diff.sh` | Shows the OpenAPI diff for a PR |
| `seed-media.sh` | Uploads sample cover images to the local R2 bucket |

Listed in `pnpm-workspace.yaml` so scripts can have a `package.json` later.

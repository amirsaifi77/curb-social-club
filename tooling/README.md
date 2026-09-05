# tooling

Repo-level scripts that do not belong to one app. Planned:

| Script | Purpose |
|---|---|
| `check-em-dashes.sh` | Fails if any Markdown file contains an em dash (also run in CI) |
| `openapi-diff.sh` | Shows the OpenAPI diff for a PR |
| `seed-media.sh` | Uploads sample cover images to the local R2 bucket |

Empty until needed. Listed in `pnpm-workspace.yaml` so scripts can have a `package.json` later.

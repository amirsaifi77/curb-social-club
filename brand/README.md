# Brand

Working identity for Cars and Coffee. See [brand-guide.md](brand-guide.md) for the rationale, palette contrast tables, type scale, voice, and Liquid Glass layout rules.

| Path | Contents |
|---|---|
| `tokens.json` | Design tokens (color, spacing, radius, typography, glass levels). Mirrored at `packages/design-tokens/tokens.json`, which is the copy the apps consume. |
| `assets/` | `logo-mark.svg`, `logo-mark-dark.svg`, `logo-horizontal.svg`, Icon Composer layers (`app-icon-background.svg`, `app-icon-foreground.svg`), `app-icon-1024.png`, `social-card-1200x630.png` |
| `previews/` | PNG renders of the six mockup artboards (feed, map, list, event detail, create-from-link, web landing) |
| `canvas/` | Source artboards for the design canvas artifact (`*.dc.html`), `canvas.json`, and `build.py` to regenerate them |
| `figma-scripts/` | `use_figma` scripts that finish the Figma file (components, screens, landing page). Prepend `00-prelude.js` to each. See the Figma section of `docs/gaps-and-open-questions.md` for the plan limit that stopped them from running. |

Figma file: https://www.figma.com/design/68kmmZuZQ2jrAWYu7vtVIe (Foundations page and icon components exist; screens are pending).

The name is a working title. The visual identity is designed to survive a rename; see the naming section of the brand guide.

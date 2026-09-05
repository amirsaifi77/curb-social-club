# @cac/design-tokens

Source of truth for color, spacing, typography, radii, elevation, and iOS glass material parameters. Consumed by web (CSS custom properties and TS) and mobile (TS theme for NativeWind or Unistyles).

`tokens.json` is a placeholder. The brand workstream fills it in. Do not invent brand values here.

## Format

W3C Design Tokens Community Group format: each token has `$value` and `$type`, groups nest, and semantic tokens reference raw ones with `{path.to.token}`. Light and dark values live under `color.semantic.*` with a `$extensions.cac.dark` override so a single file drives both themes.

## Build

```
pnpm --filter @cac/design-tokens build
```

Planned implementation: Style Dictionary v4 (or a short custom script if it feels heavy) emitting:

| Output | Consumer |
|---|---|
| `dist/tokens.ts` | Mobile theme, web components |
| `dist/tokens.css` | Web `:root` and `[data-theme="dark"]` custom properties |
| `dist/tailwind.theme.js` | NativeWind and web Tailwind config if adopted |

Outputs are generated and gitignored; the `build` task runs before dependents via Turborepo.

## Layout

```
packages/design-tokens/
  tokens.json
  build.ts
  dist/            # generated
  package.json
```

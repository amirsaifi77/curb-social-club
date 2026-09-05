# @cac/config

Shared lint, format, and TypeScript configuration. Not implemented yet.

## Contents

| File | Purpose |
|---|---|
| `eslint/base.js` | Flat config: typescript-eslint recommended, import ordering, no default exports (routes excepted), no unused vars |
| `eslint/react.js` | Adds react, react-hooks, jsx-a11y |
| `eslint/react-native.js` | Adds react-native and expo rules |
| `prettier.config.js` | 2 spaces, single quotes, trailing commas, 100 print width |
| `tsconfig.base.json` | strict, `moduleResolution: bundler`, `verbatimModuleSyntax`, `@cac/*` paths |
| `tsconfig.react.json` | base plus `jsx: react-jsx`, DOM lib |
| `tsconfig.react-native.json` | base plus Expo's tsconfig |

## Usage

```js
// apps/web/eslint.config.js
import react from "@cac/config/eslint/react";
export default [...react];
```

```json
// apps/mobile/tsconfig.json
{ "extends": "@cac/config/tsconfig.react-native.json" }
```

Ruby keeps its own rubocop config in `apps/api`.

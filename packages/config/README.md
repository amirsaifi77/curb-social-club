# @curb/config

Shared lint, format, and TypeScript configuration. Implemented in session 0.1.

## Contents

| File | Purpose |
|---|---|
| `eslint/base.js` | Flat config: typescript-eslint recommended, import ordering, no default exports (routes excepted), no unused vars |
| `eslint/react.js` | Adds react, react-hooks, jsx-a11y |
| `eslint/react-native.js` | Re-exports the react config for now; expo and react-native rules are layered in session 0.4 when `apps/mobile` exists, so the Expo toolchain is not a dependency before it has a consumer |
| `prettier.config.js` | 2 spaces, single quotes, trailing commas, 100 print width |
| `tsconfig.base.json` | strict, `moduleResolution: bundler`, `verbatimModuleSyntax`, `@curb/*` paths |
| `tsconfig.react.json` | base plus `jsx: react-jsx`, DOM lib |
| `tsconfig.react-native.json` | base plus `jsx: react-jsx`; Expo's tsconfig base is layered in session 0.4 |

## Usage

```js
// apps/web/eslint.config.js
import react from "@curb/config/eslint/react";
export default [...react];
```

```json
// apps/mobile/tsconfig.json
{ "extends": "@curb/config/tsconfig.react-native.json" }
```

Ruby keeps its own rubocop config in `apps/api`.

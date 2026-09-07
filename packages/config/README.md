# @curb/config

Shared lint, format, and TypeScript configuration. Implemented in session 0.1.

## Contents

| File | Purpose |
|---|---|
| `eslint/base.js` | Flat config: typescript-eslint recommended, import ordering, no default exports (routes excepted), no unused vars |
| `eslint/react.js` | Adds react, react-hooks, jsx-a11y |
| `eslint/react-native.js` | Re-exports the react config; `apps/mobile` layers its own route and glass-restriction rules in its `eslint.config.mjs`. `eslint-config-expo` stays out of this package so the Expo toolchain is not a dependency of every workspace |
| `prettier.config.js` | 2 spaces, single quotes, trailing commas, 100 print width |
| `tsconfig.base.json` | strict, `moduleResolution: bundler`, `verbatimModuleSyntax`, `@curb/*` paths |
| `tsconfig.react.json` | base plus `jsx: react-jsx`, DOM lib |
| `tsconfig.react-native.json` | base plus `jsx: react-jsx`; `apps/mobile` extends `["expo/tsconfig.base", "@curb/config/tsconfig.react-native.json"]` so Expo's base resolves from the app's own node_modules |

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

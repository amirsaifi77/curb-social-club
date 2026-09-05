# @cac/mobile

Expo (React Native) app for Cars and Coffee. iOS first, iOS 26 Liquid Glass design language. Not generated yet. The mobile workstream owns the deep design in `docs/mobile-liquid-glass.md`; this README is the integration contract with the rest of the monorepo.

## Generate

```sh
cd apps
pnpm dlx create-expo-app@latest mobile --template default
```

Then add `@cac/config`, `@cac/api-client`, `@cac/design-tokens`, `@cac/ui` as workspace dependencies. If Metro has trouble with pnpm symlinks, add `apps/mobile/.npmrc` with `node-linker=hoisted` and set `config.resolver.unstable_enableSymlinks = true` in `metro.config.js` with the monorepo `watchFolders`.

## Planned structure

```
apps/mobile/
  app/                        # Expo Router
    _layout.tsx               # providers: query client, auth, theme, glass tab bar
    (tabs)/
      index.tsx               # feed
      map.tsx                 # Apple Maps + supercluster
      new.tsx                 # create or paste link
      inbox.tsx               # notifications
      profile.tsx
    meets/[slug].tsx
    occurrences/[id].tsx
    imports/[id].tsx          # draft editor with polling
    u/[handle].tsx
    sign-in.tsx
  src/
    api/                      # thin wrappers over @cac/api-client
    features/                 # per-domain components and hooks
    ui/                       # glass components, tokens-driven styles
    lib/                      # location, share, secure store, push registration
  app.config.ts               # bundle id, universal links, plugins
  eas.json                    # development, preview, production profiles
  package.json
```

## Native modules expected

`react-native-maps`, `expo-apple-authentication`, `@react-native-google-signin/google-signin`, `expo-notifications`, `expo-location`, `expo-secure-store`, `expo-image`, `expo-image-manipulator`, `expo-glass-effect`, share extension plugin, Vision OCR native module or plugin.

## Integration points

| Concern | Contract |
|---|---|
| API | `EXPO_PUBLIC_API_URL`; `@cac/api-client` with token from `expo-secure-store` and `X-Device-Id` from a persisted UUID |
| Auth | Apple identity token to `POST /v1/auth/apple`, Google id token to `POST /v1/auth/google` |
| Push | Expo push token to `POST /v1/devices` |
| Deep links | `carsandcoffee://` scheme plus universal links for `https://carsandcoffee.app/meets/*` and `/u/*` |
| Import | Share extension and paste field call `POST /v1/imports`, then open `imports/[id]` |
| Location | Coarse for browse (rounded to 2 decimals), precise only during check-in |
| Tokens | Theme from `@cac/design-tokens` (NativeWind or Unistyles, mobile workstream decides) |

## Commands

| Command | What |
|---|---|
| `pnpm --filter @cac/mobile dev` | `expo start --dev-client` |
| `pnpm --filter @cac/mobile ios` | `expo run:ios` (local dev build) |
| `pnpm --filter @cac/mobile typecheck` | tsc |
| `pnpm --filter @cac/mobile test` | jest-expo |
| `pnpm --filter @cac/mobile lint` | eslint |
| `eas build --profile production --platform ios` | release build (CI runs this on `mobile-v*` tags) |

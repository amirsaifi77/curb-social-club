# @curb/mobile

Expo (React Native) app for Curb Social Club. iOS first, iOS 26 Liquid Glass design language. Not generated yet. The mobile workstream owns the deep design in `docs/mobile-liquid-glass.md`; this README is the integration contract with the rest of the monorepo.

## Generate

```sh
cd apps
pnpm dlx create-expo-app@latest mobile --template default
```

Then add `@curb/config`, `@curb/api-client`, `@curb/design-tokens`, `@curb/ui` as workspace dependencies.

## Identifiers

| Field | Value | Status |
|---|---|---|
| `expo.name` | `curb` (display name; App Store title is "Curb Social Club") | Decided |
| `expo.slug` | `curb` | Decided |
| `expo.scheme` | `curb` | Decided |
| `ios.bundleIdentifier` | `club.curbsocial.app` | Placeholder until the domain is confirmed |
| `ios.associatedDomains` | `applinks:curbsocial.club` | Placeholder, domain unconfirmed (see gaps item 2) |
| App icon | `assets/icons/Curb.icon` (Icon Composer bundle, curb-profile monogram) | Pending brand decision | If Metro has trouble with pnpm symlinks, add `apps/mobile/.npmrc` with `node-linker=hoisted` and set `config.resolver.unstable_enableSymlinks = true` in `metro.config.js` with the monorepo `watchFolders`.

## Planned structure

```
apps/mobile/
  app/                        # Expo Router; ids and phases in docs/screens.md
    _layout.tsx               # providers: query client, auth, theme, native glass tabs
    (tabs)/
      index.tsx               # S02 Home (sectioned feed)
      map.tsx                 # S03 Map, Apple Maps + supercluster, Spots layer (Phase 4)
      new.tsx                 # S06 Create: paste a link or add the details
      me.tsx                  # S07 Me
    onboarding.tsx            # S01 (modal, first launch)
    search.tsx                # S05 (modal)
    meets/[slug].tsx          # S08; also edit, schedule, claim, photos, comments routes
    meets/new.tsx             # S20
    occurrences/[id].tsx      # S09; occurrences/[id]/going.tsx is S10
    u/[handle].tsx            # S11
    clubs/[slug].tsx          # S12; clubs/[slug]/members.tsx is S13; manage and join are Phase 7
    sponsors/[slug].tsx       # S14
    spots/[slug].tsx          # S15 (Phase 4); spots/pick.tsx is S18
    posts/[id].tsx            # S16 (Phase 4); posts/new.tsx is S17
    imports/[id].tsx          # S24 draft editor with polling
    share.tsx                 # S19 share extension target: Instagram post URL to S17, anything else to import
    notifications.tsx         # S30
    me/garage.tsx, me/following.tsx
    settings.tsx              # S27 with the theme picker (S38); settings/profile.tsx, settings/delete-account.tsx
    sign-in.tsx               # S26 (modal)
    dev/gallery.tsx           # S40, dev builds only
  src/
    api/                      # thin wrappers over @curb/api-client
    features/                 # per-domain components and hooks
    ui/                       # glass components, tokens-driven styles
    lib/                      # location, share, secure store, push registration
  app.config.ts               # bundle id, universal links, plugins
  eas.json                    # development, preview, production profiles
  package.json
```

## Native modules expected

`react-native-maps`, `expo-apple-authentication`, `@react-native-google-signin/google-signin`, `expo-notifications`, `expo-location`, `expo-secure-store`, `expo-image`, `expo-image-picker`, `expo-image-manipulator`, `expo-glass-effect`, `react-native-webview` (Instagram embeds), `react-native-mmkv`, `react-native-unistyles`, share extension plugin, Vision OCR native module or plugin.

## Integration points

| Concern | Contract |
|---|---|
| API | `EXPO_PUBLIC_API_URL`; `@curb/api-client` with token from `expo-secure-store` and `X-Device-Id` from a persisted UUID |
| Auth | Apple identity token to `POST /v1/auth/apple`, Google id token to `POST /v1/auth/google` |
| Push | Expo push token to `POST /v1/devices` |
| Deep links | `curb://` scheme plus universal links for `https://curbsocial.club/meets/*` and `/u/*` (domain unconfirmed) |
| Import | Share extension and paste field call `POST /v1/imports`, then open `imports/[id]` |
| Location | Coarse for browse (rounded to 2 decimals), precise only during check-in |
| Tokens | Theme from `@curb/design-tokens`: three themes (Marine Layer default, Harbor, Olive and Ivory), each light and dark, switchable at runtime with Unistyles 3 (decided in `docs/specs/design-system-and-theming.md`) |
| Tabs | Four native Liquid Glass tabs: Home, Map, Create, Me. Notifications behind a bell on Home and under Me (`docs/screens.md`) |
| Instagram | The share extension receives Instagram post URLs and opens the post composer; embeds render from `GET /v1/posts/:id/embed` in a WebView; images are never stored (ADR 0011) |

## Commands

| Command | What |
|---|---|
| `pnpm --filter @curb/mobile dev` | `expo start --dev-client` |
| `pnpm --filter @curb/mobile ios` | `expo run:ios` (local dev build) |
| `pnpm --filter @curb/mobile typecheck` | tsc |
| `pnpm --filter @curb/mobile test` | jest-expo |
| `pnpm --filter @curb/mobile lint` | eslint |
| `eas build --profile production --platform ios` | release build (CI runs this on `mobile-v*` tags) |

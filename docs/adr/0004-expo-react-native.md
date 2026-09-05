# ADR 0004: Expo and React Native for mobile

Date: 2026-09-05. Status: Accepted.

## Context

iOS is the priority and must feel native, including the iOS 26 Liquid Glass design language. Android is desirable later. The builder manages a mobile platform team and uses Claude Code heavily, so TypeScript across mobile and web has compounding benefits. Time is the scarcest resource.

## Decision

React Native via Expo (latest SDK, currently 54) with Expo Router, TypeScript, development builds (not Expo Go), EAS Build and Submit for releases, EAS Update for JS-only patches. iOS 26 Liquid Glass through `expo-glass-effect` and native tab and toolbar components as the SDK exposes them, with graceful fallbacks on older iOS.

Native modules expected at launch: `react-native-maps` (Apple Maps), `expo-apple-authentication`, Google Sign-In, `expo-notifications`, `expo-location`, `expo-secure-store`, `expo-image`, `expo-image-manipulator`, share extension support, and a small native module or config plugin for on-device Vision OCR.

Deep detail belongs to the mobile workstream in `docs/mobile-liquid-glass.md`.

## Alternatives

| Option | Why not |
|---|---|
| SwiftUI | Best native fidelity, and SwiftUI has first-class Liquid Glass. But it forks the codebase from web, removes the shared api-client and types, and doubles the surface for one person. Revisit only if React Native cannot achieve acceptable glass fidelity. |
| Bare React Native | Expo's config plugins, EAS, and Router remove weeks of native project maintenance. Expo supports every native module we need. |
| Flutter | Different language, no sharing with the web app. |
| Capacitor or web wrapper | Map performance and native feel would not meet the bar. |

## Consequences

Positive: shared TypeScript, tokens, and API client with web. EAS handles signing and TestFlight. Expo Router gives deep links and universal links with little code.

Negative: Liquid Glass fidelity depends on Expo and community modules tracking iOS 26; some effects may need a custom native view. Expo SDK upgrades are periodic maintenance. pnpm with Metro occasionally needs the hoisted linker for the mobile app.

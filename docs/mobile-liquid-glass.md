# Liquid Glass on Mobile: Expo / React Native research for Cars and Coffee

Workstream: mobile platform. Date: 2026-09-05. Target: iOS first, Android second, Expo Router, TypeScript.

## TL;DR

Build on **Expo SDK 57** (current stable, `expo@57.0.20` published 2026-09-04, React Native 0.86, React 19.2, Xcode 26.4+ required). Get Liquid Glass "for free" from the native navigation layer: **Expo Router native tabs** (`expo-router/unstable-native-tabs`) for the tab bar and **native Stack** headers, toolbars, search bars and form sheets. Use **`expo-glass-effect`** only for a handful of custom floating controls over the map. Do not put glass on content. Ship with a **development build** (not Expo Go) so `UIDesignRequiresCompatibility`, push, maps and Sign in with Apple all work. Plan to move to SDK 58 as soon as it ships because iOS 27 / Xcode 27 (expected mid-September 2026) make Liquid Glass mandatory and require the UIScene lifecycle, which SDK 57's prebuild template does not yet emit.

## 1. What Liquid Glass is

Liquid Glass is the design language Apple introduced at WWDC 2025 for iOS 26, iPadOS 26, macOS 26, tvOS 26 and watchOS 26. Apple describes it as "a new dynamic material ... which combines the optical properties of glass with a sense of fluidity" that "forms a distinct functional layer for controls and navigation elements" ([Adopting Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass)). Three properties define it ([Meet Liquid Glass, WWDC25 219](https://developer.apple.com/videos/play/wwdc2025/219/)):

| Property | What it means |
|---|---|
| Lensing | The material "dynamically bends, shapes, and concentrates light in real time" instead of scattering it like the old blur materials |
| Adaptivity | Shadow opacity, tint and light/dark appearance shift automatically based on what scrolls beneath |
| Morphing | Controls fluidly merge, split and transform (buttons into menus, tab bar into a compact pill) |

### Key components

| Component | iOS 26 behavior | Native API |
|---|---|---|
| Glass material | Two variants. `regular` is adaptive and is the default. `clear` is "permanently more transparent" and needs a dimming layer beneath it | `UIGlassEffect`, SwiftUI `.glassEffect()` |
| Floating tab bar | Floats above content, can minimize to a small pill on scroll and expand on reverse scroll | `tabBarMinimizeBehavior = .onScrollDown` |
| Search tab | A `role: .search` tab is split off and pinned at the trailing end of the tab bar | `UISearchTab` / `Tab(role: .search)` |
| Bottom accessory | A floating view above the tab bar (Now Playing style) | `UITabBarController.bottomAccessory` |
| Toolbars and nav bars | Glass, with grouped item backgrounds and fixed spacers between groups; scroll edge effect keeps them legible | `UIToolbar`, `UINavigationBar` |
| Search placement | On iPhone the search field sits in a bottom toolbar and rises with the keyboard; on iPad it sits top trailing | `UINavigationItem.searchBarPlacement` |
| Sheets | Larger corner radius; half sheets are inset from the display edges and turn more opaque when expanded to full height | `UISheetPresentationController` |
| Action sheets | Originate from the source control instead of the bottom edge | `confirmationDialog`, `sourceItem` |
| Buttons | New glass button styles | `.glass`, `.glassProminent`, `UIButton.Configuration.glass()` |
| App icons | Layered icons that get system reflection, refraction and shadow; default, dark, clear and tinted appearances | Icon Composer `.icon` bundles |

### Apple's guidance on when to use it

Apple is explicit that glass belongs to the navigation layer and not to content:

- "Liquid Glass applies to the topmost layer of the interface, where you define your navigation. Key navigation elements like tab bars and sidebars float in this Liquid Glass layer to help people focus on the underlying content." ([Adopting Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass))
- "Liquid Glass is best reserved for the navigation layer that floats above the content of your app." and "Always avoid glass on glass." ([WWDC25 219](https://developer.apple.com/videos/play/wwdc2025/219/))
- "Avoid overusing Liquid Glass effects. If you apply Liquid Glass effects to a custom control, do so sparingly ... Limit these effects to the most important functional elements in your app." ([Adopting Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass))
- Use `clear` only when all three hold: the element is over media-rich content, the content will not suffer from a dimming layer, and the content above the glass is bold and bright ([WWDC25 219](https://developer.apple.com/videos/play/wwdc2025/219/)).
- Tint sparingly: "Tinting should only be used to bring emphasis to primary elements and actions in the UI ... When every element is tinted, nothing stands out." ([WWDC25 219](https://developer.apple.com/videos/play/wwdc2025/219/))
- "Reduce your use of custom backgrounds in controls and navigation elements" because they "might overlay or interfere with Liquid Glass or other effects that the system provides, such as the scroll edge effect." ([Adopting Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass))

For Cars and Coffee this translates to: feed cards, event photos, map tiles and comment threads are content and stay opaque. Tab bar, headers, the map's floating filter and locate-me controls, and sheets are the glass layer.

### iOS 27 status (September 2026)

WWDC 2026 refined rather than replaced Liquid Glass: search moves back into the tab bar in system apps and a system-wide intensity slider lets users dial the effect down ([TechTimes, 2026-06-08](https://www.techtimes.com/articles/317975/20260608/apple-liquid-glass-ios-27-wwdc-2026-brings-refinements-developers-must-adopt-today.htm)). The important developer facts are that the `UIDesignRequiresCompatibility` opt-out is ignored when building against the iOS 27 SDK ([Apple docs](https://developer.apple.com/documentation/bundleresources/information-property-list/uidesignrequirescompatibility)) and apps built with the iOS 27 SDK must adopt the UIScene lifecycle or they will not launch (Apple TN3187, summarized in [Classmethod's migration guide](https://dev.classmethod.jp/en/articles/ios27-xcode27-migration-preparation-guide/)). iOS 27 is expected around September 14, 2026 ([9to5Mac](https://9to5mac.com/2026/08/25/ios-27-release-date-when-next-major-iphone-update-is-coming/)) and App Store submissions are expected to require the iOS 27 SDK from roughly April 2027. Designing for Liquid Glass now is the safe bet; the opt-out is a short-lived escape hatch.

## 2. Achieving Liquid Glass in Expo / React Native, ranked

Ranking is for an iOS-first Expo Router app on SDK 57.

### 2.1 Expo Router native tabs (recommended for the tab bar)

`NativeTabs` renders a real `UITabBarController`, so the floating glass tab bar, minimize-on-scroll, search tab, scroll-to-top and dynamic tint all come from UIKit. Import from `expo-router/unstable-native-tabs`; the docs still mark it "in alpha ... Its API is subject to change" as of SDK 57 ([Native tabs docs](https://docs.expo.dev/router/advanced/native-tabs/)). It has shipped in every SDK since 54 and Expo's own SDK 55 template uses it ([SDK 55 beta](https://expo.dev/changelog/sdk-55-beta)).

```tsx
// app/(tabs)/_layout.tsx
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { PlatformColor } from 'react-native';

export default function TabLayout() {
  return (
    <NativeTabs minimizeBehavior="onScrollDown" tintColor={PlatformColor('label')}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
        <NativeTabs.Trigger.Label>Feed</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="map">
        <NativeTabs.Trigger.Icon sf="map" md="map" />
        <NativeTabs.Trigger.Label>Map</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="create">
        <NativeTabs.Trigger.Icon sf="plus.circle" md="add_circle" />
        <NativeTabs.Trigger.Label>Create</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="meets">
        <NativeTabs.Trigger.Icon sf="calendar" md="event" />
        <NativeTabs.Trigger.Label>Meets</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Icon sf="person.crop.circle" md="person" />
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
```

Key API facts from the [docs](https://docs.expo.dev/router/advanced/native-tabs/): `NativeTabs.Trigger.Icon` takes `sf` (SF Symbol name or `{default, selected}`), `md` (Material Symbol, SDK 55+), `src` (image) or `xcasset` (SDK 55+); `minimizeBehavior="onScrollDown"`; `role="search"` on a trigger creates the separated iOS 26 search tab; `<NativeTabs.BottomAccessory>` (SDK 55+) floats a view above the bar; `disableTransparentOnScrollEdge`; `backgroundColor` and `blurEffect` are ignored on iOS 26+ because the system draws glass. Expo's stated best practices are SF Symbols on iOS, Material on Android, and `PlatformColor('label')` for tint so glass adapts to light and dark ([Expo on X](https://x.com/expo/status/1969125891763519764)).

Limitations: max 5 tabs on Android; no nested native tabs on iOS; all tabs render eagerly (gate expensive content with `useIsFocused`); no custom tab bar component (you get Apple's bar or nothing); web falls back to a basic layout, so provide `_layout.web.tsx` with `expo-router/ui` headless tabs. One field report notes Android icon rendering bugs and recommends JS `<Tabs>` on Android via a platform-specific layout file ([amillionmonkeys](https://www.amillionmonkeys.co.uk/blog/expo-liquid-glass-tab-bar-ios)). Icon libraries such as `@expo/vector-icons` do not work in native tabs.

### 2.2 Native Stack headers, toolbars, search and sheets (recommended, zero extra deps)

Expo Router's default `Stack` wraps `react-native-screens`, so on iOS 26 headers become glass automatically; the docs note Liquid Glass "cannot be disabled per-screen" ([Stack docs](https://docs.expo.dev/router/advanced/stack/)). Relevant options:

| Option | Use |
|---|---|
| `<Stack.Title large>` / `headerLargeTitle` | Large collapsing titles (needs a scroll view as the screen root) |
| `headerTransparent` | Header floats over content, content should extend beneath it |
| `headerSearchBarOptions.placement` | `automatic`, `stacked`, `inline`, `integrated`, `integratedButton`, `integratedCentered`; the `integrated*` values put search in the iOS 26 bottom toolbar |
| `<Stack.Toolbar placement="right">` with `Stack.Toolbar.Button`, `Spacer`, `Badge` | Glass toolbars with grouped items (SDK 55+; badges added in SDK 57) |
| `scrollEdgeEffects` | `automatic`, `hard`, `soft`, `hidden` (iOS 26+). Do not combine with `headerBlurEffect` |
| `presentation: 'formSheet'` with `sheetAllowedDetents`, `sheetGrabberVisible` | Native iOS 26 inset half sheets; SDK 55 form sheet headers "automatically adopt the Liquid Glass design language with no code changes" ([SDK 55 changelog](https://expo.dev/changelog/sdk-55)) |
| Apple zoom transition | Shared element zoom from a card into detail (SDK 55+) |

Opt-out options are `UIDesignRequiresCompatibility: true` (dev build only, gone with iOS 27) or `expo-router/js-stack` for a JS-drawn stack. Neither is recommended here.

### 2.3 expo-glass-effect (recommended for a few custom floating controls)

`expo-glass-effect` wraps `UIVisualEffectView` + `UIGlassEffect`. Current version is `57.0.1` (first released 2025-09-03 as 0.1.0, versioned with the SDK since 55). iOS and tvOS only, iOS 26+, included in Expo Go, and it "falls back to a regular View" elsewhere ([GlassEffect docs](https://docs.expo.dev/versions/latest/sdk/glass-effect/)).

```tsx
import { GlassView, GlassContainer, isLiquidGlassAvailable } from 'expo-glass-effect';

export function MapControls() {
  if (!isLiquidGlassAvailable()) return <FallbackControls />;
  return (
    <GlassContainer spacing={12} style={styles.stack}>
      <GlassView isInteractive glassEffectStyle="regular" style={styles.pill}>
        <FilterButton />
      </GlassView>
      <GlassView isInteractive glassEffectStyle="regular" tintColor={tokens.brand.accent} style={styles.round}>
        <LocateMeButton />
      </GlassView>
    </GlassContainer>
  );
}
```

API: `GlassView` props `glassEffectStyle` (`'clear' | 'regular' | 'none'` or `{ style, animate, animationDuration }`), `tintColor`, `isInteractive`, `colorScheme` (`'auto' | 'light' | 'dark'`); `GlassContainer` prop `spacing` controls when neighboring glass merges; helpers `isLiquidGlassAvailable()` (checks OS, compiler and Info.plist) and `isGlassEffectAPIAvailable()`. Known issue: "Setting `opacity` to `0` on `GlassView` or any of its parent views causes the glass effect to not render at all," so animate via `glassEffectStyle` rather than opacity ([docs](https://docs.expo.dev/versions/latest/sdk/glass-effect/)). No Android implementation. Maintained by Expo, so it tracks SDK releases.

### 2.4 @expo/ui (SwiftUI) with the glassEffect modifier (optional, for SwiftUI-native pieces)

`@expo/ui` (`57.0.16`) became production-stable in SDK 56: "the Jetpack Compose (Android) and SwiftUI (iOS) APIs in Expo UI are stable" ([SDK 56 beta](https://expo.dev/changelog/sdk-56-beta)). It exposes 40+ SwiftUI views inside a `<Host>` and modifiers including `glassEffect({ cornerRadius, glass: { variant: 'regular' | 'clear' | 'identity', tint, interactive }, shape })`, `glassEffectId` for morphing within a `GlassEffectContainer`, and `buttonStyle('glass' | 'glassProminent')` (iOS 26+ only) ([modifiers docs](https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/modifiers/), [Expo blog](https://expo.dev/blog/liquid-glass-app-with-expo-ui-and-swiftui)). Limitation: SwiftUI controls layout inside `<Host>`, so you use `HStack`/`VStack`, not flexbox, and it is a second layout system to learn. Use it for things that are painful in RN (glass buttons that morph into menus, native `Form` settings screens), not for the core screens.

### 2.5 @callstack/liquid-glass (alternative to expo-glass-effect)

`@callstack/liquid-glass` (`0.8.1`) offers `LiquidGlassView` (`effect: 'clear' | 'regular' | 'none'`, `interactive`, `tintColor`, `colorScheme`), `LiquidGlassContainerView` (`spacing`) and `isLiquidGlassSupported`. Requires iOS 26 / Xcode 26, RN 0.80+, New Architecture, and "is not supported in Expo Go"; renders as a transparent View elsewhere. Documented quirk: automatic text color adaptation fails when the glass is taller than 65 pt ([GitHub](https://github.com/callstack/liquid-glass)). Functionally equivalent to `expo-glass-effect`; prefer the Expo package since it is versioned with the SDK.

### 2.6 react-native-bottom-tabs (alternative tab bar)

Callstack's `react-native-bottom-tabs` (`1.4.0`) also wraps `UITabBarController` and ships an Expo template ([GitHub](https://github.com/callstackincubator/react-native-bottom-tabs)). It predates Expo's native tabs and is the right choice only if you are not on Expo Router or need its React Navigation integration. On Expo Router use `NativeTabs`.

### 2.7 expo-glass-tabs (JS-drawn glass tab bar, not recommended)

`davidmokos/expo-glass-tabs` is a pure TypeScript floating tab bar built on Reanimated, gesture handler and `expo-glass-effect`, with Revolut-style scrubbing and haptics. It has 23 stars and no published release ([GitHub](https://github.com/davidmokos/expo-glass-tabs)). Interesting as a reference for custom behavior, too early for production.

### 2.8 Fallbacks for iOS < 26 and Android

`expo-blur` (`BlurView` with `systemThinMaterial` style tints on iOS, experimental on Android) or `@react-native-community/blur` give a frosted look that reads as "pre-26 iOS" without pretending to be glass. On Android the honest fallback is Material 3: opaque or tonal surfaces, a standard bottom navigation bar, and Material Symbols. Expo Router's Colors API (SDK 55+) provides Material 3 dynamic colors for this ([SDK 55 changelog](https://expo.dev/changelog/sdk-55)). Do not attempt to fake lensing with gradients or Skia shaders on the navigation layer; it looks wrong and costs battery.

### Summary table

| Approach | Maturity (Sep 2026) | Scope | Expo Go | Verdict |
|---|---|---|---|---|
| `expo-router/unstable-native-tabs` | Alpha label, shipping since SDK 54, used in Expo templates | Tab bar | Yes | Use |
| Native Stack headers, toolbars, sheets | Stable | Headers, search, toolbars, sheets | Yes | Use |
| `expo-glass-effect` 57.0.1 | Stable, Expo-maintained | Custom glass views | Yes | Use sparingly |
| `@expo/ui` 57.0.16 | Stable since SDK 56 | SwiftUI views, glass buttons | Yes | Optional |
| `@callstack/liquid-glass` 0.8.1 | Maintained | Custom glass views | No | Alternative |
| `react-native-bottom-tabs` 1.4.0 | Maintained | Tab bar | Template | Only without Expo Router |
| `expo-glass-tabs` | Pre-release | JS tab bar | Yes | No |
| `expo-blur` | Stable | Fallback material | Yes | Fallback only |

## 3. Requirements

| Requirement | Detail | Source |
|---|---|---|
| Expo SDK | **SDK 57** (`expo@57.0.20`, released 2026-06-30, RN 0.86, React 19.2). SDK 56 (May 21, 2026) and 55 (Feb 25, 2026) also support iOS 26. SDK 58 is canary only (`58.0.0-canary-20260902`) | [SDK 57 changelog](https://expo.dev/changelog/sdk-57), [SDK 56](https://expo.dev/changelog/sdk-56), npm dist-tags |
| Xcode | Minimum Xcode 26.4 for SDK 56 and 57 (SDK 55: 26.0; SDK 54: 16.1 minimum, 26 recommended for iOS 26 features) | [SDK 56 changelog](https://expo.dev/changelog/sdk-56), [SDK 54](https://expo.dev/changelog/sdk-54) |
| iOS deployment target | 16.4 minimum on SDK 56+ (iPhone 7 dropped). Glass effects appear only on iOS 26+ | [SDK 56 changelog](https://expo.dev/changelog/sdk-56) |
| Architecture | New Architecture only since SDK 55; Legacy Architecture removed | [SDK 55 changelog](https://expo.dev/changelog/sdk-55) |
| Expo Go | SDK 57 Go is available for simulators, Android and via `eas go` on iOS devices; App Store approval was still pending at release. `expo-glass-effect`, native tabs and `@expo/ui` work in Go, but push notifications, maps API keys, Sign in with Apple entitlements and `UIDesignRequiresCompatibility` need a **development build**. Use `expo-dev-client` from day one | [SDK 57 changelog](https://expo.dev/changelog/sdk-57), [push setup](https://docs.expo.dev/push-notifications/push-notifications-setup/) |
| EAS Build image | SDK 57 default is `macos-tahoe-26.5-xcode-26.6` (also `latest`); SDK 56 uses `macos-tahoe-26.4-xcode-26.4`. No Xcode 27 image yet | [EAS infrastructure](https://docs.expo.dev/build-reference/infrastructure/) |
| `UIDesignRequiresCompatibility` | Set `ios.infoPlist.UIDesignRequiresCompatibility: true` in app config to keep the pre-26 look. Apple: "Temporarily use this key while reviewing and refining your app's UI" and "The system ignores this key when you build for iOS 27 or later." Do not plan on it | [Apple docs](https://developer.apple.com/documentation/bundleresources/information-property-list/uidesignrequirescompatibility) |
| App icon | Icon Composer `.icon` bundle via `"ios": { "icon": "./assets/app.icon" }`, supported since SDK 54; dark and tinted variants are handled inside the `.icon`, and older iOS gets a system fallback. Keep a 1024 PNG for Android and stores | [Splash and icon docs](https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/), [SDK 54](https://expo.dev/changelog/sdk-54) |
| iOS 27 / Xcode 27 | Not yet supported: SDK 56/57 prebuild output crashes under Xcode 27 beta with "UIScene life cycle is required" (expo/expo [#46663](https://github.com/expo/expo/issues/46663), [#46664](https://github.com/expo/expo/issues/46664), open, assigned). Keep building with Xcode 26.x until SDK 58 | GitHub issues |

```json
// app.json (excerpt)
{
  "expo": {
    "ios": {
      "icon": "./assets/icons/CarsAndCoffee.icon",
      "bundleIdentifier": "com.carsandcoffee.app",
      "associatedDomains": ["applinks:carsandcoffee.app"],
      "infoPlist": { "UIDesignRequiresCompatibility": false }
    },
    "plugins": ["expo-router", "expo-dev-client", "expo-notifications", "expo-apple-authentication"]
  }
}
```

## 4. Design constraints and pitfalls

**Contrast over maps and photos.** The map screen is the hardest case: glass over satellite tiles, POI labels and photo pins. Use `regular` glass (adaptive) for controls over the map; reserve `clear` for the event detail hero photo overlay only if the label text is large and bold, otherwise add a scrim. Never place body text on glass. Apple's scroll edge effect handles the feed header; for a custom floating header over the map, use `headerTransparent` plus `scrollEdgeEffects` rather than your own blur.

**Performance.** Each `GlassView` is a live `UIVisualEffectView`; keep them to a handful per screen and wrap neighbors in a `GlassContainer`, which Apple says "helps optimize performance while fluidly morphing" ([Adopting Liquid Glass](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass)). Do not put glass inside `FlatList`/`FlashList` rows. Never animate glass with `opacity` (it disables the effect); animate `glassEffectStyle` instead.

**Glass on glass.** No glass views inside sheets, toolbars, the tab bar or the header, which are already glass. A `GlassContainer` is the only sanctioned way to group glass elements, and they should be siblings, not nested.

**Custom backgrounds on bars.** Any `backgroundColor`, `headerStyle` background or `blurEffect` on native tabs, headers and toolbars is either ignored on iOS 26 or fights the system. Remove them and let the system decide.

**Fallback strategy so nothing looks broken.** Branch on capability, not OS version. The three tiers:

| Tier | Detection | Tab bar | Header | Floating controls |
|---|---|---|---|---|
| iOS 26+ | `isLiquidGlassAvailable()` | Native glass, minimize on scroll | Native glass, large title | `GlassView` |
| iOS 16.4 to 18 | `Platform.OS === 'ios'` and not available | Native tabs (system blur bar) | Native header (system blur) | `expo-blur` pill with `systemThinMaterial` |
| Android | `Platform.OS === 'android'` | JS `<Tabs>` or native tabs with Material Symbols | Material 3 header via Colors API | Tonal elevated surface, no blur |

Keep the same layout, spacing and iconography across tiers so screens differ in material only. Encapsulate this in a `packages/ui` `Surface` primitive with a `material="glass" | "blur" | "solid"` prop resolved at runtime.

**Accessibility.** On iOS 26, Reduce Transparency makes glass frostier and Increase Contrast makes it near-solid with borders; Reduce Motion drops the elastic effects ([WWDC25 219](https://developer.apple.com/videos/play/wwdc2025/219/)). System components handle this. For custom `GlassView`s, subscribe to `AccessibilityInfo.isReduceTransparencyEnabled()` and the `reduceTransparencyChanged` event (iOS only, [RN docs](https://reactnative.dev/docs/accessibilityinfo)) and swap to the solid tier. Every SF Symbol tab and toolbar icon needs an accessibility label. Test with the iOS 27 intensity slider once available.

**Adoption math.** Apple measured 79% of all iPhones and 86% of iPhones from the last four years on iOS 26 by June 7, 2026 ([MacRumors](https://www.macrumors.com/2026/06/09/ios-26-adoption-stats-wwdc/)). With iOS 27 shipping in September, the pre-26 tier will be a small minority by launch; do not over-invest in it.

## 5. Recommended mobile architecture

### Navigation (Expo Router, file-based)

```
apps/mobile/app/
  _layout.tsx                 # root Stack, providers, deep-link handling
  (tabs)/_layout.tsx          # NativeTabs (iOS/Android), _layout.web.tsx for web
  (tabs)/index.tsx            # Feed
  (tabs)/map.tsx              # Map
  (tabs)/create.tsx           # Create (opens a formSheet immediately)
  (tabs)/meets.tsx            # List (same query as map, sorted by date/distance)
  (tabs)/profile.tsx          # Profile (or sign-in prompt when anonymous)
  meet/[id].tsx               # Event detail (pushed onto root stack, zoom transition from card)
  meet/[id]/photos.tsx
  create/import.tsx           # Paste-a-link importer, presentation: 'formSheet'
  create/manual.tsx
  auth/sign-in.tsx            # formSheet; Apple + Google
  user/[handle].tsx
  +not-found.tsx
```

Feed, Map and Meets are tabs; Create and Profile are tabs too so the 5-tab bar matches Apple's pattern. Consider `role="search"` on a sixth trigger later if search becomes central; iOS 27 is moving search back into the bar, so keep it simple at launch. Event detail lives on the root stack so it covers the tab bar and can use the Apple zoom transition from the card.

### Data layer

TanStack Query 5 (`@tanstack/react-query@5.102.8`) with a typed client in `packages/api-client` generated from the Rails OpenAPI spec (rswag or oas_rails on the API side, `openapi-typescript` + `openapi-fetch` on the TS side). Query keys live in the shared package so web and mobile share cache conventions. Persist the cache to MMKV (`react-native-mmkv@4.3.2`) via `@tanstack/query-async-storage-persister` so the feed opens instantly offline. Anonymous browsing means the client must work without a token; attach the session token when present. Small global state (auth session, location permission state, selected filters) goes in Zustand.

### Maps

Recommendation: **`react-native-maps` (1.29.0) with Apple Maps on iOS and Google Maps on Android**, plus supercluster-based clustering (`react-native-map-clustering@4.0.0` or a thin supercluster hook). Rationale: `expo-maps` (57.0.2) is still alpha, "will frequently experience breaking changes," has no clustering and no Google Maps on iOS ([expo-maps docs](https://docs.expo.dev/versions/latest/sdk/maps/)); `react-native-maps` is included in Expo Go, defaults to Apple Maps on iOS and needs only a Google key for Android ([Expo map-view docs](https://docs.expo.dev/versions/latest/sdk/map-view/)). Apple Maps is the right look under a Liquid Glass UI, costs nothing, and matches the iOS-first brief. Mapbox (`@rnmapbox/maps` 10.3.5) is the upgrade path if custom styling or vector tile control becomes important; revisit `expo-maps` when it reaches beta. Server does the heavy lifting: PostGIS bounding-box query returns pins; client clusters what it has.

### Location

`expo-location` with `requestForegroundPermissionsAsync` on first map or feed use, not at launch. Show a soft explainer before the system prompt. Anonymous users can browse by "near you" with foreground location only; no background location at launch.

### Push notifications

`expo-notifications` (57.0.17) with Expo's push service: APNs key generated through `eas credentials`, FCM v1 for Android, and the `ExpoPushToken` tied to the EAS `projectId` stored on the Rails side per device ([setup docs](https://docs.expo.dev/push-notifications/push-notifications-setup/)). Requires a development build. Notification categories at launch: new meet near you, host you follow posted, reminder before a meet you RSVP'd to. Ask for permission after the first RSVP or follow, never on first launch.

### Auth

Sign in with Apple via `expo-apple-authentication` (57.0.1), Google via `expo-auth-session` (57.0.11) using the Google provider and PKCE; both exchange the identity token with Rails, which issues its own session JWT stored in `expo-secure-store`. The app boots anonymous and only routes to `auth/sign-in` (a form sheet) when the user taps post, RSVP, follow or comment.

### Images

`expo-image-picker` (57.0.16) with `allowsMultipleSelection`, resize client-side with `expo-image-manipulator` to about 2000 px, then upload direct to S3 or R2 with a presigned PUT from Rails (ActiveStorage direct upload). Render with `expo-image` (blurhash placeholders from the API).

### Deep links, universal links, share

Scheme `carsandcoffee://` plus universal links: `ios.associatedDomains: ["applinks:carsandcoffee.app"]` and an AASA file at `/.well-known/apple-app-site-association` served by the web app; EAS registers the entitlement automatically ([universal links docs](https://docs.expo.dev/linking/ios-universal-links/)). Android App Links via `intentFilters` with `autoVerify`. Expo Router maps `https://carsandcoffee.app/meet/123` to `meet/[id]` for free. Share out uses `expo-sharing` / RN `Share` with the canonical web URL so iMessage and Instagram unfurl the OG card the web app renders.

### EAS Build, Submit, Update

Three build profiles: `development` (dev client, simulator + device), `preview` (internal distribution, TestFlight), `production`. Pin `image: "macos-tahoe-26.5-xcode-26.6"` in `eas.json` until the SDK 58 upgrade, then move to the Xcode 27 image. `eas submit` for TestFlight and App Store. EAS Update policy: OTA only for JS-level fixes and copy changes on the same runtime version (`runtimeVersion: { policy: "appVersion" }`); any change to native modules, permissions, icons or SDK ships as a store build. SDK 55+ bytecode diffing makes updates about 75% smaller, so OTA for hotfixes is cheap ([SDK 55 changelog](https://expo.dev/changelog/sdk-55)). Never OTA a change that alters how glass surfaces render without a device pass on iOS 26 and 27.

### Testing

Jest with `jest-expo` and `@testing-library/react-native` for hooks, importers' parsing, and components; Maestro flows in `.maestro/` run on EAS Workflows with a `maestro` job that takes the simulator build's `build_id` ([EAS Workflows E2E](https://docs.expo.dev/eas/workflows/examples/e2e-tests/)). Three Maestro flows at launch: browse feed anonymously, open a meet from the map, paste-a-link create.

### Folder structure

```
apps/mobile/
  app/                    # routes only (see above)
  src/
    features/
      feed/               # FeedScreen parts, useFeedQuery, FeedCard
      map/                # MapScreen parts, clustering hook, MapControls (glass)
      meets/              # list, MeetRow
      meet-detail/
      create/             # ImportFromLinkSheet, ManualForm, importer hooks
      auth/
      profile/
    components/           # app-specific composites (EventCard, HostChip)
    navigation/           # linking config, typed routes helpers
    lib/                  # query client, api instance, storage, analytics
    hooks/                # useLiquidGlass, useLocationPermission, useSession
    theme/                # Unistyles config wiring tokens from packages/design-tokens
  assets/icons/CarsAndCoffee.icon
  .maestro/
  app.json  eas.json  metro.config.js  tsconfig.json
packages/
  api-client/             # openapi types + fetch client + query keys
  design-tokens/          # brand palette, spacing, radii, typography (TS + CSS)
  ui/                     # cross-platform primitives (Surface, Text, Button)
```

### Design tokens and styling: Unistyles 3

Expose tokens as a plain TypeScript package (`packages/design-tokens`) that exports typed objects (`colors.light`, `colors.dark`, `spacing`, `radii`, `typography`) and also emits a `tokens.css` with CSS custom properties via a small build script for the web app. Mobile consumes the TS objects through **`react-native-unistyles@3.3.0`** themes.

Why Unistyles over NativeWind: Unistyles 3 takes the token objects directly (no Tailwind config layer between the design tokens package and the styles), resolves styles on the native side with no re-render on theme or breakpoint change, supports `PlatformColor` and adaptive themes needed for glass tint, and is a stable 3.x release. NativeWind v5 is still labeled preview as of July 2026 and has open issues with `@theme` color variables ([NativeWind v5 guide](https://www.codesofphoenix.com/articles/expo/v5-nativewind)); v4 is stable but tied to Tailwind v3 config. If the team strongly prefers class names, the Unistyles authors' `uniwind` (1.12.0) supports Tailwind v4 `@theme` CSS variables, which would let the same `tokens.css` drive both web and mobile ([uniwind.dev](https://uniwind.dev/)); it is the only Tailwind option worth considering and can be adopted later without changing the tokens package.

```ts
// packages/design-tokens/src/index.ts
export const colors = {
  light: { bg: '#FAF7F2', text: '#1B1B1F', accent: '#C2410C', muted: '#6B6B70' },
  dark:  { bg: '#121214', text: '#F4F1EC', accent: '#F97316', muted: '#A1A1A8' },
} as const;
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 } as const;
export const radii = { pill: 999, card: 20, sheet: 28 } as const;

// apps/mobile/src/theme/unistyles.ts
import { StyleSheet } from 'react-native-unistyles';
import { colors, spacing, radii } from '@cac/design-tokens';
StyleSheet.configure({
  themes: { light: { colors: colors.light, spacing, radii }, dark: { colors: colors.dark, spacing, radii } },
  settings: { adaptiveThemes: true },
});
```

## 6. Liquid Glass checklist for the first screens

**Feed**
- Native tabs with `minimizeBehavior="onScrollDown"`; feed is a `FlashList` so scroll-to-top and minimize work.
- Native header with `<Stack.Title large>` and `scrollEdgeEffects="automatic"`; no `headerStyle` background.
- Cards are opaque content surfaces from tokens; no glass in rows.
- Filter chips are plain controls in the content layer, not glass.

**Map**
- `headerTransparent` header or no header; `react-native-maps` fills the screen under the tab bar with `disableAutomaticContentInsets` handled.
- One `GlassContainer` bottom-right with two `GlassView`s (filters, locate me), `regular` style, `isInteractive`, capability-gated with `isLiquidGlassAvailable()` and a blur/solid fallback.
- Selected pin opens a `formSheet` with `sheetAllowedDetents: [0.35, 0.9]` and `sheetGrabberVisible`; sheet content is opaque.
- Verify contrast over satellite tiles and in dark mode; check Reduce Transparency.

**List (Meets)**
- Native header with `headerSearchBarOptions` and `placement: 'integrated'` so search sits in the bottom toolbar on iOS 26.
- Sort and distance controls in a `Stack.Toolbar` (grouped, icon-only, labeled for VoiceOver).
- Rows are opaque; distance and date badges use tinted text, not tinted glass.

**Event detail**
- Pushed on the root stack with the Apple zoom transition from the card.
- Hero photo scrolls under a transparent header; back and share are system toolbar items (glass comes from the system).
- Single prominent RSVP button; if using `@expo/ui`, `buttonStyle('glassProminent')` with brand tint, otherwise a solid accent button. Nothing else tinted.
- Source link, host, attendees, photos and comments are content, all opaque.

**Create from link**
- Opens as a `formSheet` from the Create tab with `sheetAllowedDetents: [0.5, 1]`; header adopts glass automatically.
- Paste field uses the native form sheet header; parsing progress and the scaffolded draft are ordinary content.
- Cancel and Save in the sheet header via `Stack.Toolbar`, not custom glass buttons.
- Anonymous users hit the sign-in form sheet only when they tap Publish.

## Sources

- Expo SDK 57 changelog: https://expo.dev/changelog/sdk-57
- Expo SDK 56 changelog: https://expo.dev/changelog/sdk-56
- Expo SDK 56 beta: https://expo.dev/changelog/sdk-56-beta
- Expo SDK 55 changelog: https://expo.dev/changelog/sdk-55
- Expo SDK 55 beta: https://expo.dev/changelog/sdk-55-beta
- Expo SDK 54 changelog: https://expo.dev/changelog/sdk-54
- Expo native tabs: https://docs.expo.dev/router/advanced/native-tabs/
- Expo Stack: https://docs.expo.dev/router/advanced/stack/
- Expo GlassEffect: https://docs.expo.dev/versions/latest/sdk/glass-effect/
- Expo UI: https://docs.expo.dev/versions/latest/sdk/ui/ and modifiers: https://docs.expo.dev/versions/latest/sdk/ui/swift-ui/modifiers/
- Expo blog, Liquid Glass with Expo UI: https://expo.dev/blog/liquid-glass-app-with-expo-ui-and-swiftui
- Expo native tabs best practices: https://x.com/expo/status/1969125891763519764
- Expo app icon and Icon Composer: https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/
- EAS Build infrastructure images: https://docs.expo.dev/build-reference/infrastructure/
- Expo push notifications setup: https://docs.expo.dev/push-notifications/push-notifications-setup/
- Expo universal links: https://docs.expo.dev/linking/ios-universal-links/
- EAS Workflows E2E with Maestro: https://docs.expo.dev/eas/workflows/examples/e2e-tests/
- expo-maps: https://docs.expo.dev/versions/latest/sdk/maps/
- react-native-maps in Expo: https://docs.expo.dev/versions/latest/sdk/map-view/
- Expo Go: https://expo.dev/go
- expo/expo #46663 Xcode 27 UIScene: https://github.com/expo/expo/issues/46663
- expo/expo #46664: https://github.com/expo/expo/issues/46664
- Apple, Adopting Liquid Glass: https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass
- Apple, Liquid Glass overview: https://developer.apple.com/documentation/technologyoverviews/liquid-glass
- Apple, UIDesignRequiresCompatibility: https://developer.apple.com/documentation/bundleresources/information-property-list/uidesignrequirescompatibility
- Apple, WWDC25 Meet Liquid Glass: https://developer.apple.com/videos/play/wwdc2025/219/
- React Native AccessibilityInfo: https://reactnative.dev/docs/accessibilityinfo
- @callstack/liquid-glass: https://github.com/callstack/liquid-glass
- react-native-bottom-tabs: https://github.com/callstackincubator/react-native-bottom-tabs
- expo-glass-tabs: https://github.com/davidmokos/expo-glass-tabs
- Field report on native tabs: https://www.amillionmonkeys.co.uk/blog/expo-liquid-glass-tab-bar-ios
- SDK 57 upgrade guide (paddyb): https://paddyb.com/tutorials/expo-sdk-57-upgrade-guide.html
- iOS 27 refinements (TechTimes): https://www.techtimes.com/articles/317975/20260608/apple-liquid-glass-ios-27-wwdc-2026-brings-refinements-developers-must-adopt-today.htm
- iOS 27 / Xcode 27 migration (Classmethod): https://dev.classmethod.jp/en/articles/ios27-xcode27-migration-preparation-guide/
- iOS 27 release date (9to5Mac): https://9to5mac.com/2026/08/25/ios-27-release-date-when-next-major-iphone-update-is-coming/
- iOS 26 adoption (MacRumors): https://www.macrumors.com/2026/06/09/ios-26-adoption-stats-wwdc/
- NativeWind v5 status: https://www.codesofphoenix.com/articles/expo/v5-nativewind
- Uniwind: https://uniwind.dev/
- npm registry (versions checked 2026-09-05): expo 57.0.20, expo-router 57.0.19, expo-glass-effect 57.0.1, @expo/ui 57.0.16, @callstack/liquid-glass 0.8.1, react-native-bottom-tabs 1.4.0, react-native-maps 1.29.0, expo-maps 57.0.2, react-native-unistyles 3.3.0, nativewind 4.2.6, uniwind 1.12.0, @tanstack/react-query 5.102.8

# Spec: Design system and theming

Status: draft. Phase: 0. Last updated: 2026-09-06.
Depends on: none (every other spec depends on this one). Related decisions: ADR 0004, ADR 0009, gaps items 26, 27, 28, 30, 31; `brand/brand-guide.md` sections 4 to 8; `docs/mobile-liquid-glass.md` sections 3 to 6; `docs/components/primary-cta.md`.

## Summary

The design system is one token file rendered six ways (three themes by light and dark), consumed as a Unistyles runtime theme on mobile and as CSS variable sets on web, with fonts loaded and subset once. It upholds flat rendering under Liquid Glass: glass is the system chrome only, content is solid theme fills and thin rules, the serif appears on headlines and titles and nowhere near a button. Phase 0 exits only when every screen has been reviewed on a physical iPhone in all six variants and the result is written down in `brand/previews/`.

## User stories

| Id | Story |
|---|---|
| US-1 | As the builder, I want one token source that generates the mobile theme and the web CSS so that a color change in `tokens.json` reaches every screen without hand edits. |
| US-2 | As a browser, I want the app to follow my phone's light or dark setting so that it looks right without me touching a switch. |
| US-3 | As a browser, I want to pick Marine Layer, Harbor, or Olive and Ivory in Settings and see it applied immediately so that the app feels like mine. |
| US-4 | As the builder, I want to review all six variants on a device before Phase 0 ends so that the default theme (gaps item 26) is chosen from real screens, not renders. |
| US-5 | As a member, I want the one action on a screen to feel immediate and honest (pressed, saving, done, failed) so that I trust that a tap did something. |
| US-6 | As a Claude Code session, I want typed tokens, a `Text` primitive, and a `Surface` primitive so that no screen invents its own colors, fonts, or glass. |

## Scope

In Phase 0: `@curb/design-tokens` build and validation; six theme variants wired into Unistyles 3 on mobile and `tokens.css` on web; system appearance with a manual override; the theme picker (S38) inside the Phase 0 Settings skeleton (S27); font subsetting and loading on both platforms; `Text` and `Surface` primitives on mobile; the `PrimaryButton` component and the shared `useAsyncAction` hook with the full state machine; the flat-rendering QA checklist and its record in `brand/previews/`.

Not in this phase: a web theme picker (web ships Marine Layer following system appearance; a picker is Phase 7 with web sign-in, if ever); map pin rendering (discovery.md, uses the `pin*` roles defined here); the long-running CTA stage copy for the importer (import-from-link.md, uses the variant defined here); Android Material fallbacks (Phase 7); the Figma variable collection rebuild (brand workstream, gaps item 31; this spec names the frames it expects).

## Requirements

**Data**

- R-1 `packages/design-tokens/tokens.json` MUST be the only source of color, typography, spacing, radius, glass, and motion values; no app or package MAY declare a hex, font size, or duration outside a token. (US-1, US-6)
- R-2 `pnpm --filter @curb/design-tokens build` MUST emit `dist/tokens.ts` (exports `themes`, `getTheme`, `typography`, `spacing`, `radius`, `glass`, `motion`, and the types `ThemeName`, `Scheme`, `Role`, `ThemeColors`), `dist/tokens.css`, and `dist/tailwind.theme.js`, and `dist/**` MUST be gitignored. (US-1)
- R-3 The build MUST fail when any theme or scheme is missing one of the 22 color roles (the 21 in the package README plus `accentPressed`), when a text role on `bg`, `surface`, or `surfaceRaised` is under 4.5:1, when `accentInk` on `accent` is under 5.5:1, or when a `pin*` role on `bg` is under 3:1. (US-1)
- R-4 Generated outputs (`dist/**`) and the hex values in `tokens.json` MUST NOT be hand-edited; hexes come from `brand-v2/work/palette.py`, and a PR that changes a hex without the matching brand guide table change SHOULD be rejected in review. (US-1)
- R-5 `getTheme(name, scheme)` MUST fall back to `marine-layer` for an unknown name and to `light` for an unknown scheme. (US-2)

**Mobile**

- R-6 The app MUST configure Unistyles once at boot with two registered themes, `light` and `dark`, each built from `getTheme(selectedTheme, scheme)` plus `typography`, `spacing`, `radius`, `glass`, `motion`, and `settings.adaptiveThemes: true`. (US-2, US-3)
- R-7 Changing the theme MUST call `UnistylesRuntime.updateTheme` for both `light` and `dark` so the change applies without a restart and without remounting the navigator. (US-3)
- R-8 The appearance setting MUST support `system`, `light`, and `dark`: `system` keeps adaptive themes on and calls `Appearance.setColorScheme(null)`; `light` or `dark` turns adaptive themes off, calls `UnistylesRuntime.setTheme`, and calls `Appearance.setColorScheme` with the same value so the native tab bar, sheets, and alerts follow the override. (US-2, US-3)
- R-9 Theme and appearance MUST persist in MMKV under `curb.theme` as `{ theme, appearance }`, default `{ theme: "marine-layer", appearance: "system" }`, read synchronously before the first render. (US-3)
- R-10 `app.json` MUST set `userInterfaceStyle: "automatic"`, and no tab bar, header, or toolbar MAY set a background color or blur (`docs/mobile-liquid-glass.md` section 4). (US-2)
- R-11 Fonts MUST load through `expo-font` in the root layout behind `SplashScreen.preventAutoHideAsync`, using the subset files `InstrumentSerif-Regular`, `Geist-Regular`, `Geist-Medium`, `Geist-SemiBold` from `packages/design-tokens/fonts/`; Instrument Serif Italic MUST NOT ship in the app bundle. (US-6)
- R-12 A `Text` primitive at `apps/mobile/src/ui/Text.tsx` MUST expose exactly the eight styles in `typography.scale` (`display`, `title`, `headline`, `subhead`, `body`, `caption`, `plate`, `label`), apply `tnum` and uppercase for `plate` and `label`, and scale with Dynamic Type (`maxFontSizeMultiplier` 1.5 for `display` and `title`, 2.0 otherwise). (US-6)
- R-13 Serif surfaces are limited to `display`, `title`, and `headline`: screen headlines, event titles, section headers, host names on host pages, empty-state headlines, and the wordmark. Tab labels, compact navigation titles, sheet headers, alerts, and context menus MUST stay SF Pro (gaps item 28); large titles MAY use `headerLargeTitleStyle.fontFamily` with the serif, and the compact title MUST NOT. (US-6)
- R-14 A `Surface` primitive at `apps/mobile/src/ui/Surface.tsx` MUST resolve `material="glass" | "blur" | "solid"` at runtime per the tiers in `docs/mobile-liquid-glass.md` section 4, and imports of `expo-glass-effect` and `expo-blur` MUST be restricted by ESLint `no-restricted-imports` to `apps/mobile/src/ui/**`. (US-6)
- R-15 Content surfaces MUST use `surface` on `bg` with 1px `border` rules or 16pt whitespace, never both; sheets and menus use `surfaceRaised`; no gradient, drop shadow, inner glow, or opacity-faded accent MAY appear in the content layer. (US-4, US-6)
- R-16 `PrimaryButton` at `apps/mobile/src/ui/PrimaryButton.tsx` MUST implement every state in `docs/components/primary-cta.md` (idle, pressed, loading, long running, confirmed, going, error, queued, disabled) with the fills, sizes (52pt, 8pt radius), haptics, and reduced-motion set from that document, reading every color from the theme and every duration from `motion`. (US-5)
- R-17 `useAsyncAction(fn, { delay: 150, minLoading: 400, hold: 600, timeout: 10000 })` in `packages/ui/src/hooks/` MUST run the state machine (no loading under 150 ms, loading shown at least 400 ms, confirmed held 600 ms, error at 10 s with silent late-success reconciliation) and MUST be the only place those timings live in code besides `motion`. (US-5)
- R-18 The long-running variant MUST accept `stages: string[]` rotated every 1500 ms, render a 2pt `accent` on `border` progress bar 8pt below the button, and MUST NOT show the bar for operations under 2 s. (US-5)
- R-19 In `__DEV__` builds only, a gallery route `dev/gallery` MUST render every `PrimaryButton` status, every `Text` style, and a `Surface` per material so the device QA can see them side by side; it MUST be excluded from release builds. (US-4)

**Web**

- R-20 `apps/web/app/root.tsx` MUST import `dist/tokens.css`, where `:root` equals Marine Layer light, `@media (prefers-color-scheme: dark)` switches `:root` to Marine Layer dark, and every other variant is addressable as `[data-theme="<name>"][data-scheme="<scheme>"]`. (US-1, US-2)
- R-21 Web MUST self-host `.woff2` subsets from `packages/design-tokens/fonts/` with `font-display: swap` and the stacks `"Instrument Serif", Fraunces, Georgia, serif` and `Geist, Inter, system-ui, sans-serif`; Fraunces and Inter are named fallbacks and MUST NOT be bundled. (US-6)
- R-22 The web `PrimaryButton` MUST mirror the mobile state names as `data-status`, use CSS transitions with the `motion` values, honor `prefers-reduced-motion`, and set `aria-busy` and an `aria-live="polite"` caption. (US-5)
- R-23 Glass on web MUST be limited to the site header: `backdrop-filter: blur(20px) saturate(1.1)` over `glassTint`; content uses hairlines only. (US-6)

**Admin and jobs**

- R-24 CI MUST run the tokens build before `typecheck` for `@curb/mobile` and `@curb/web` (Turborepo `dependsOn: ["^build"]`), so a broken token file fails the pipeline, not a device. (US-1)

## Data

No database tables. Files: `packages/design-tokens/tokens.json` (source, W3C `$value` and `$type` for colors; plain objects for `typography`, `spacing`, `radius`, `glass`, `motion`), `packages/design-tokens/fonts/*.ttf` and `*.woff2` (committed subsets, produced by `pnpm --filter @curb/design-tokens fonts`, which runs `pyftsubset` with `--unicodes="U+0020-007E,U+00A0-00FF,U+2018-201A,U+201C-201E,U+2022,U+2026,U+2032-2033"` and `--layout-features="kern,liga,tnum,case"`), `packages/design-tokens/dist/**` (generated, ignored). Device storage: MMKV key `curb.theme`. Nothing is synced to the API; the theme is a device setting.

## API

None. Theme and appearance never leave the device, and no endpoint reads them.

## Screens and states

| Screen id | Screen | Route (mobile / web) | Primary actions | States |
|---|---|---|---|---|
| S38 | Theme picker | inside `settings` / none | Pick a theme (three rows), pick an appearance (System, Light, Dark) | none beyond standard: no loading, no empty, no error, works offline |
| S27 | Settings (Phase 0 skeleton: Theme section, Account section, About section) | `settings` / none | Open S38 rows, sign in or out (auth-and-accounts.md), legal links | signed-out (Theme and About still shown), offline |
| dev only | Component gallery | `dev/gallery` / none | Cycle CTA statuses, toggle reduce motion | `__DEV__` only, not in `docs/screens.md` by design (see Risks) |

The four tab placeholders (S02, S03, S06, S07 skeletons) are Phase 0 screens for QA purposes only; their behavior is owned by discovery.md, create-and-host-tools.md, and profiles-and-follow.md.

## Copy

| Where | String |
|---|---|
| S27 title | Settings |
| S27 Theme section header | Theme |
| S38 theme row, default | Marine Layer |
| S38 theme row, default caption | Fog white, wet asphalt, Lido Blue. The default. |
| S38 theme row | Harbor |
| S38 theme row caption | Navy, bone, sand, old brass. |
| S38 theme row | Olive and Ivory |
| S38 theme row caption | Sage, ivory, stone, burnt sienna. |
| S38 appearance header | Appearance |
| S38 appearance options | System, Light, Dark |
| S38 appearance footnote (System) | Follows your phone's setting. |
| S38 accessibility label, selected row | Marine Layer, selected |
| Gallery, CTA idle | I'm going |
| Gallery, CTA going | Going |
| Gallery, CTA loading caption after 2 s | Still working |
| Gallery, CTA error caption | Couldn't save. Check your connection. |
| Gallery, CTA queued caption | Saved on this phone. Will sync when you're back online. |
| Gallery, CTA disabled labels | Cancelled, Ended |
| Gallery, long-running stages | Reading link, Finding the date, Finding the place, Drafting your event |

## Acceptance criteria

| Id | Given | When | Then | Proves |
|---|---|---|---|---|
| AC-1 | A clean checkout | `pnpm --filter @curb/design-tokens build` | `dist/tokens.ts`, `dist/tokens.css`, `dist/tailwind.theme.js` exist; `git status` shows no tracked change; `tsc --noEmit` on a file importing `getTheme` passes | R-2, R-4 |
| AC-2 | A test fixture copy of `tokens.json` with `harbor.dark.accentInk` removed, and another with `accentInk` set to `#888888` on Marine Layer light | The build runs against each fixture | Exit code 1 with a message naming the theme, scheme, and role (or the failing contrast pair and ratio) | R-3 |
| AC-3 | `dist/tokens.ts` built | `getTheme("nope", "sideways")` | Returns the Marine Layer light map; `getTheme("harbor", "dark").accent` equals `#CBA55B` | R-5 |
| AC-4 | `dist/tokens.css` built | The file is grepped | `:root{--color-bg:#F3F4F4` is present; a `@media (prefers-color-scheme: dark)` block sets `--color-bg:#15181A`; `[data-theme="olive-ivory"][data-scheme="dark"]` is present; `--font-display` and `--font-ui` are defined | R-20 |
| AC-5 | The app on a physical iPhone, phone in light mode, Marine Layer | Harbor is tapped in S38 | Every visible surface changes within one frame, no navigator remount (scroll position on Home is kept), and after force-quit and relaunch Harbor is still selected | R-6, R-7, R-9 |
| AC-6 | The app on device, phone in light mode | Appearance is set to Dark in S38 | Content goes dark and the native tab bar, a form sheet, and a system alert render dark too; setting System returns them to light | R-8 |
| AC-7 | The app on device with `Font.isLoaded` checked in the gallery | The app launches | Splash hides only after the four families report loaded; the gallery shows serif headlines and Geist body; `InstrumentSerif-Italic` is absent from the bundle (`expo export` manifest) | R-11 |
| AC-8 | Jest with fake timers around `useAsyncAction` | `fn` resolves at 100 ms | Status goes `idle` to `confirmed` with no `loading`; after 600 ms status is `going` | R-17 |
| AC-9 | Same harness | `fn` resolves at 160 ms | `loading` is observed and lasts at least 400 ms before `confirmed` | R-17 |
| AC-10 | Same harness | `fn` rejects at 50 ms | `loading` lasts at least 400 ms, then `error`; `fn` never resolving yields `error` at 10,000 ms, and a resolution at 12,000 ms flips status to `going` without passing through `confirmed` | R-17 |
| AC-11 | React Native Testing Library rendering `PrimaryButton` with each controlled `status` in Marine Layer light and Harbor dark | Snapshots are taken | One snapshot per status per theme matches; `accessibilityState.busy` is true for `loading` and `long running`; `disabled` reads the reason label | R-16 |
| AC-12 | `AccessibilityInfo.isReduceMotionEnabled` mocked true | `PrimaryButton` moves idle to loading to confirmed | No scale transform is applied, the ring is replaced by the "Saving" label plus activity indicator, the check appears without drawing on | R-16 |
| AC-13 | A file under `apps/mobile/src/features/` importing `expo-glass-effect` | `pnpm --filter @curb/mobile lint` | ESLint fails with the `no-restricted-imports` message pointing at `src/ui/Surface` | R-14 |
| AC-14 | The gallery on device | The long-running CTA is started with four stages and a 6 s promise | Stage copy rotates every 1.5 s, the progress bar appears, and on resolve the check draws and the bar reaches 100 percent; a 1 s promise shows no bar | R-18 |
| AC-15 | A release build (`eas build --profile preview`) | The URL `curb://dev/gallery` is opened | The route does not exist (not-found screen) | R-19 |
| AC-16 | `apps/web` running locally in Marine Layer | The header and a card are inspected in devtools | Only the header has `backdrop-filter`; the card has no `box-shadow` beyond `0 0 0 1px` and no gradient; the CTA `<button>` has `data-status="idle"` and, during a mocked 500 ms action, `aria-busy="true"` | R-22, R-23 |
| AC-17 | Every Phase 0 screen (four tab placeholders, S26, S27 with S38, S35, gallery) on a physical iPhone on iOS 26 | Reviewed in all six variants against the checklist in Verification | `brand/previews/phase-0/flat-rendering.md` records a pass for every cell, with screenshots under `brand/previews/phase-0/` | R-15, R-13, exit gate |

## Verification

| Check | How |
|---|---|
| Tokens | `pnpm --filter @curb/design-tokens build && pnpm --filter @curb/design-tokens test` (Vitest: AC-2, AC-3, AC-4 as file assertions on `dist/`) |
| Mobile unit | `pnpm --filter @curb/mobile test` (Jest: `useAsyncAction.test.ts` for AC-8 to AC-10, `PrimaryButton.test.tsx` snapshots for AC-11 and AC-12) and `pnpm --filter @curb/mobile lint` for AC-13 |
| Web | `pnpm --filter @curb/web test` Playwright smoke on `/` asserting AC-16 |
| Device checklist, per variant (marine-layer, harbor, olive-ivory by light, dark) | On a physical iPhone: (1) tab bar and header glass show the page `bg` through the tint with no colored band; (2) no gradient, glow, or drop shadow anywhere in content; (3) cards are `surface` on `bg` with hairline `border` rules; (4) exactly one accent per screen; (5) serif only on the headline and titles, SF Pro on tab labels and the compact title after scroll; (6) theme switch applies without restart; (7) appearance override moves native chrome; (8) Reduce Transparency and Increase Contrast checked in Marine Layer light and dark only; (9) Dynamic Type at AX5 checked in Marine Layer light only; (10) the CTA in every status in the gallery. Record each cell as pass or fail with a note. |
| Record | `brand/previews/phase-0/flat-rendering.md` (table: variant, screen, check, result, note) and `brand/previews/phase-0/<theme>-<scheme>-<screen>.png`; the default theme decision (gaps item 26) is written at the top of that file |
| Design | Figma "Foundations" page: Colors (six modes), Type scale, Spacing, Radius, Glass; "Components" page: Primary CTA (nine statuses), Text, Surface; "iOS Screens": Settings, Theme picker (to be rebuilt per gaps item 31) |

## Risks and open questions

- Gaps item 26 (default theme): Marine Layer light is assumed. AC-17 is where the decision is confirmed or changed; changing it is a one-line edit to `meta.defaultTheme` plus the App Store screenshot plan.
- Gaps item 28 (serif in the tab bar): resolved as content only. This spec enforces it by leaving native tabs untouched (R-10, R-13).
- Adopted 2026-09-06 into docs/screens.md as S40: `dev/gallery` is a dev-build-only component gallery, excluded from release builds.
- Adopted 2026-09-06 into docs/components/primary-cta.md: its implementation notes place `PrimaryButton` in `packages/ui`, but `packages/ui/README.md` forbids rendering code there. This spec puts the shared `useAsyncAction` hook in `packages/ui` and the two `PrimaryButton` renderers in `apps/mobile/src/ui` and `apps/web/app/components`.
- Adopted 2026-09-06 into docs/mobile-liquid-glass.md section 4: the `Surface` primitive lives in `apps/mobile/src/ui`, not `packages/ui`, for the same reason.
- Unistyles 3 adaptive themes bind to the theme names `light` and `dark`. R-6 and R-7 use `updateTheme` to swap the palette inside those two names rather than registering six themes. If `updateTheme` proves unable to update nested `colors` objects wholesale, register six named themes and manage adaptivity in the store with `Appearance.addChangeListener`; the persisted shape is unchanged.
- `Appearance.setColorScheme` is honored by native stack and native tabs in RN 0.86; if a system sheet ignores it on a given iOS build, note it in the QA record and accept the mismatch for Phase 0.
- The tokens README lists `dist/tailwind.theme.js`; nothing consumes it at launch (Unistyles on mobile, CSS variables on web). Emitting it is cheap and keeps the README true; drop it if it drifts.
- `pyftsubset` needs Python and `fonttools`; the subsets are committed so CI never needs Python. Regenerate only when a font version changes.
- Gaps item 30 (pin and confidence labels) affects `pin*` role usage in discovery.md, not this spec.

## Session breakdown

| Slice | Deliverable | Covers | Must pass |
|---|---|---|---|
| 1 (Phase 0) | `packages/design-tokens/build.ts` with validation, `dist/` outputs, Vitest file assertions, Turborepo wiring, `fonts` script and committed subsets | R-1 to R-5, R-24 | AC-1 to AC-4 |
| 2 (Phase 0) | Mobile theme store (MMKV), Unistyles configure and `updateTheme` wiring, appearance override with `Appearance.setColorScheme`, `app.json` settings, font loading in the root layout | R-6 to R-11 | AC-5 to AC-7 (device) |
| 3 (Phase 0) | `Text` and `Surface` primitives, ESLint import restriction, S27 Phase 0 skeleton with the Theme section and S38 | R-12 to R-15 | AC-5, AC-6, AC-13 |
| 4 (Phase 0) | `useAsyncAction` in `packages/ui` with Jest timing tests; `PrimaryButton` on mobile with Reanimated, SVG ring and check, haptics, reduced motion; snapshot tests; `dev/gallery` | R-16 to R-19 | AC-8 to AC-12, AC-14, AC-15 |
| 5 (Phase 0 for tokens and fonts, Phase 7 for the web button) | Web: `tokens.css` and `@font-face` in `root.tsx`, header glass, Playwright smoke ship in session 0.8; the web `PrimaryButton` waits for the first web write surface | R-20 to R-23 | AC-4, AC-16 (button part deferred) |
| 6 (Phase 0, exit gate) | Device QA in six variants, screenshots, `brand/previews/phase0-flat-rendering.md`, default theme confirmed | R-13, R-15 | AC-17 |

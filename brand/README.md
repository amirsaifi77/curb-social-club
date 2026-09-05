# brand

Brand assets for Curb Social Club (in the app: curb). Version 2.0, 2026-09-05. This replaces the Cars and Coffee amber brand; nothing from v0.1 is still in use.

Figma: https://www.figma.com/design/aRyM1JhTPCIhMpPLX051T9 (brand guide, variables with six theme modes, components, screens). Design canvas: https://claude.ai/code/artifact/b3bc82aa-c60f-4cef-91e4-e28b1c51ab9a

## What is here

| Path | What | Used by |
| --- | --- | --- |
| `brand-guide.md` | The brand guide: essence, naming, voice, the three themes with contrast tables, type scale, layout under Liquid Glass, iconography, logo system, app icon, photography, do and don't. | Everyone. Read this first. |
| `tokens.json` | Themed design tokens, W3C-style. Three themes (`marine-layer`, `harbor`, `olive-ivory`), two schemes each (`light`, `dark`), the same 21 role names in every one. Also the type scale, spacing, radii, and glass settings. | Copied to `packages/design-tokens/tokens.json`. Mirrored in Figma as variable modes. |
| `logos/` | 12 marks as clean SVG (viewBox, no font dependencies), each in three color variants: ink (no suffix), `-light`, `-accent`. Primary wordmark is `wordmark-01-chamfer.svg`, primary monogram is `monogram-01-stroke.svg`. Lockups `lockup-horizontal-01..03` and `lockup-stacked-01`. | App, web header, email, print. See guide section 9 for which goes where. |
| `icons/<theme>/` | iOS 26 layered app icon per theme: `background.svg` and `foreground.svg` for Icon Composer, plus the flattened `icon-1024.png` for App Store Connect and Expo. | `apps/mobile` app icon and alternate icons. |
| `canvas/` | The design canvas sources. Each `*.dc.html` is one artboard; `canvas.json` lays them out; `build.py` regenerates all of them from `tokens.json` and `logos/`; `render.py` makes the PNG previews with Playwright; `curb-social-club-design-canvas.html` is the assembled canvas as published. | Design reference for mobile and web. Edit `build.py` and rerun, or edit in the published canvas. |
| `previews/` | 2x PNG renders of every artboard: `Main` (Feed), `Map`, `List`, `EventDetail`, `CreateFromLink`, `ThemeComparison`, `Landing`, `BrandBoard`. | Quick look without opening the canvas. Attach to issues and PRs. |
| `work/` | Generators: `palette.py` (colors, contrast, tokens), `logos.py`, `icons.py`, `sheets.py`. | Regenerating tokens, logos, icons, and the sheets below. |
| `brand-sheet.png` | 2400x1600 one-page overview: wordmarks, monograms, lockups, app icons, type pairing, palettes. | Sharing the brand at a glance. The editable version is the Brand board artboard in `canvas/`. |
| `palette-<theme>.png` | 1600x1000 palette card per theme, light and dark. | Theme discussions, Figma reference. |
| `social-card-1200x630.png` | Open Graph and iMessage preview, Marine Layer. | `apps/web` meta tags. |

## Artboards in the canvas

| Artboard | Size | Shows |
| --- | --- | --- |
| Feed (`Main.dc.html`) | 402x874 | Serif masthead, filter chips, 4:3 event cards with plate-style time and distance and a host-confirmed chip, glass tab bar. |
| Map | 402x874 | Flat map, pins in the six pin-state colors, a peeking event sheet, glass bottom search and tab bar. |
| List | 402x874 | Day sections on hairline rules, rows with thumbnails, Date and Distance sort. |
| Event detail | 402x874 | 16:9 hero, serif title, Confirmed by host and Last confirmed lines, host row, series line, description, source attribution, one accent action. |
| Create from link | 402x874 | Pasted Evite URL, draft fields with Sure, Check, and Guess confidence chips, Post. |
| Theme comparison | 1848x1080 | The Feed in Marine Layer, Harbor, Olive and Ivory, and Marine Layer Dark. |
| Web landing | 1440x2260 | Header lockup, serif headline, phone mock, weekend teasers, the Every meet, every car line, host steps, footer. |
| Brand board | 2400x1760 | Editable version of `brand-sheet.png`: wordmark and monogram options, lockups, app icons, color variants, type pairing, all three palettes. |

## Rules that matter most

1. Marine Layer light is the default. Do not mix themes on one screen.
2. Flat content: solid fills, 1px hairlines in `border`, no gradients, no shadows heavier than `0 0 0 1px border`. Liquid Glass is the navigation layer only.
3. One serif headline per screen (Instrument Serif), everything else in Geist. SF Pro for iOS system chrome, never overridden.
4. One accent per screen: the single action that matters and the today pin.
5. Times, distances, dates, and counts in the plate style: uppercase, tracked, tabular. It is the only uppercase text in the product.
6. "curb" is always lowercase. The category is "cars and coffee", lowercase. The product is never called Cars and Coffee.

## Regenerating

```
cd brand/work && python3 palette.py && python3 logos.py && python3 icons.py && python3 sheets.py
cd ../canvas && python3 build.py && python3 render.py ../previews
```

`render.py` needs Playwright with Chromium and the Instrument Serif and Geist TTFs installed locally (Google Fonts is blocked during the render so the local faces are used).

# Primary CTA: states, motion, and behavior

The primary call to action is the one accent-colored action on a screen: "I'm going" on event detail, "Follow" on a host page, "Post event" on the create sheet, "Import" on the paste-a-link sheet. This spec covers the button itself, the state machine behind it, the motion between states, and the long-running variant used by the importer. It applies to iOS first and to web with the same timings.

Design constraints from the brand: flat fills, no shadows, no glows, one accent per screen, sentence case, Geist Subhead (15/20 medium) for the label, 8pt radius, 52pt tall on iOS (48px on web), full width inside a sheet, hug width inline. Glass is never used on a button; the CTA is content, and it can sit on a glass toolbar only as an accessory pill.

## States

| State | Fill | Label | Icon | Notes |
|---|---|---|---|---|
| Idle | `accent` (Lido Blue) | `accentInk`, "I'm going" | none | Default. 52pt tall, full width in the detail sheet. |
| Pressed | `accentPressed` | same | none | Scale 0.98, 80ms. Fill darkens one step. Released without moving fires the action. |
| Loading | `accent` | hidden (opacity 0, retained for width) | 20pt ring, 1.5pt stroke, `accentInk` at 35% track, full-alpha 90 degree arc rotating 1 turn per 900ms | Width and height never change. Button is `accessibilityState busy`, not disabled visually, but taps are ignored. |
| Long running | `accent` | stage copy, e.g. "Reading link" | ring | Loading plus rotating stage copy. Used only by operations expected to exceed 2s (importer, photo upload). |
| Confirmed | `accent` | hidden | 20pt check, stroke drawn on over 240ms | A moment, not a resting state. Holds 600ms then settles into Going. Success haptic on the first frame of the check. |
| Going (settled) | `surface`, 1px `accent` stroke | `accent`, "Going" | 16pt check, static, leading | The toggled resting state. Tapping opens a confirmation ("Not going anymore?") rather than toggling instantly, because leaving is rarer than joining. |
| Error | `accent` | `accentInk`, "Try again" | none | Fill returns to idle. A caption in `error` appears below: "Couldn't save. Check your connection." Error haptic. The caption clears on the next tap. No shake. |
| Queued (offline) | `surface`, 1px `accent` stroke | `accent`, "Going" | 16pt check | Optimistic. Caption in `textSecondary`: "Saved on this phone. Will sync when you're back online." Clears on sync. |
| Disabled | `border` | `textSecondary` | none | Used when the event is cancelled or in the past. Label changes to the reason: "Cancelled", "Ended". Never a 40% opacity version of Idle. |

Colors above resolve through the theme, so the same component renders in Harbor and Olive and Ivory without changes. `accentPressed` is a new token role in every theme (Marine Layer: `#0A1D32` light, `#B9D3EC` dark), and the timings below are exported as `motion` in `packages/design-tokens/tokens.json`.

## State machine

```
Idle ──press──▶ Pressed ──release──▶ Submitting
                  │ cancel (drag off)         │
                  ▼                           │ <150ms response
                Idle ◀────────────────────────┤ (skip Loading entirely)
                                              │ ≥150ms
                                              ▼
                                           Loading ──2000ms──▶ Loading (caption "Still working")
                                              │                      │
                                   success    │   failure / 10s timeout
                                              ▼                      ▼
                                          Confirmed (600ms)        Error ──press──▶ Submitting
                                              │
                                              ▼
                                            Going ──press──▶ confirm sheet ──yes──▶ Submitting (remove) ──▶ Idle
Offline at press:  Idle ──▶ Queued (optimistic) ──sync ok──▶ Going
                                            └──sync fail──▶ Error
```

Rules that keep the button from flickering:

The loading indicator appears only if the request has not resolved within 150ms. Most RSVP calls return faster than that on a good connection, and the user then sees Idle jump straight to Confirmed, which feels immediate. Once Loading is shown it stays for at least 400ms, even if the response arrives at 160ms, so the ring never flashes. Confirmed always holds 600ms before settling. Error never appears before Loading has shown for its minimum, so a failure at 100ms still reads as "tried, then failed" rather than a glitch.

The 2s caption and the 10s timeout are client-side. The server call is not cancelled at 10s; the UI moves to Error and the response, if it eventually arrives, is reconciled silently (a late success flips Error to Going without animation).

## Motion

| Transition | Duration | Easing | What moves |
|---|---|---|---|
| Idle to Pressed | 80ms | ease-out | scale 1.00 to 0.98, fill to `accentPressed` |
| Pressed to Idle (cancel) | 120ms | ease-out | scale and fill back |
| Idle to Loading | 120ms out, 120ms in | ease-in-out | label opacity to 0, ring opacity 0 to 1 (staggered by 60ms), ring begins rotating |
| Loading (steady) | 900ms per turn | linear | ring rotation only. No pulsing, no width change. |
| Loading to Confirmed | 240ms | ease-out | ring stops, its arc completes to a full circle over 120ms and fades; the check draws on with `strokeDashoffset` 1 to 0 over 240ms starting at 60ms |
| Confirmed to Going | 200ms | ease-in-out | fill `accent` to `surface`, stroke 0 to 1px `accent`, check scales 20 to 16pt and moves to the leading position, label "Going" fades in |
| Loading to Error | 160ms | ease-out | ring fades, label "Try again" fades in, caption slides up 4pt and fades in |
| Count update ("42 going" to "43 going") | 200ms | ease-out | the changed digit slides up 12pt and fades; the old digit slides up and out. Runs at the first frame of Confirmed. |

Easing: standard `cubic-bezier(0.2, 0, 0, 1)`. Scale uses a spring on iOS (Reanimated `withSpring`, damping 20, stiffness 300, mass 0.6) so a quick tap and a held press both settle cleanly.

Reduced motion (`prefers-reduced-motion` on web, `AccessibilityInfo.isReduceMotionEnabled` on iOS): no scale, all opacity transitions at 120ms, the ring is replaced with the label "Saving" and the system activity indicator, the check appears without drawing on, and the count changes without the slide.

Haptics (iOS only, `expo-haptics`): `impactAsync(Light)` on press down, `notificationAsync(Success)` on the first frame of Confirmed, `notificationAsync(Error)` on Error. Nothing on Loading, nothing on Going.

## The long-running variant (importer, uploads)

"Import" on the paste-a-link sheet runs OCR and an LLM extraction that take 3 to 8 seconds. A bare ring for 8 seconds feels broken, so this variant adds stage copy inside the button and a hairline progress bar beneath it.

Stage copy, changed by the client on a timer (every 1500ms) or by the server when it streams progress: "Reading link", "Finding the date", "Finding the place", "Drafting your event". The last stage repeats until the response arrives. Copy is `accentInk`, crossfades 120ms, never truncates (the button is full width).

Progress bar: 2pt tall, `accent` on `border`, sits 8pt below the button, full width. Determinate when the server streams a fraction; otherwise it advances on a log curve (fast to 60%, then slows) and jumps to 100% on completion. It is never shown for operations under 2s.

Completion: the check draws on as in the standard button, then the sheet transitions to the draft event form. The button does not settle into a Going state here; it disappears with the sheet.

Failure copy is specific: "We couldn't read that link. Paste the invite text instead." with a secondary "Paste text" button, since the fallback path is the fix.

## Accessibility

`accessibilityRole="button"`, `accessibilityLabel` equal to the visible label, `accessibilityState={{ busy: true }}` during Loading and Long running, `{ disabled: true }` for Disabled. On state change, `AccessibilityInfo.announceForAccessibility` says "Saving", then "You're going" or "Couldn't save". Minimum hit target 44pt is met by the 52pt height. The label meets AA on the fill in every theme (Marine Layer: 13.2:1 light, 9.5:1 dark). Loading is not conveyed by color alone; the ring plus the busy state cover VoiceOver and Switch Control.

## Copy

| Context | Idle | Going | Loading caption after 2s | Error caption |
|---|---|---|---|---|
| Event detail | I'm going | Going | Still working | Couldn't save. Check your connection. |
| Host page | Follow | Following | Still working | Couldn't save. Check your connection. |
| Create sheet | Post event | (leaves the sheet) | Still posting | Couldn't post. Your draft is saved. |
| Import sheet | Import | (leaves the sheet) | (stage copy instead) | We couldn't read that link. Paste the invite text instead. |

Sentence case, no exclamation marks, no "Oops". Captions are Caption style (12/16 medium) in `textSecondary` or `error`.

## Implementation notes

iOS (Expo, Reanimated 4, react-native-svg, expo-haptics). One component, `PrimaryButton`, in `packages/ui`, with a controlled `status` prop (`idle | loading | confirmed | going | error | queued | disabled`) and an optional uncontrolled mode where `onPress` returns a Promise and the component runs the state machine itself, including the 150ms delay, the 400ms minimum, the 600ms hold, and the 10s timeout. The ring is an SVG circle with `strokeDasharray` and a rotating `transform`; the check is an SVG path with an animated `strokeDashoffset` (`useAnimatedProps`). The fill color is a `useDerivedValue` interpolated through `interpolateColor` between theme tokens so the pressed state tracks the theme. Do not use `Animated` from core; do not use Lottie for the check, it makes theming harder than a 12-line path.

Web (React Router, CSS). Same state names as `data-status` attributes on a `<button>`. Transitions are CSS; the ring is an inline SVG with a CSS rotation keyframe; the check uses `stroke-dashoffset` with a transition. `prefers-reduced-motion` switches to the reduced set above. `aria-busy` mirrors `busy`, `aria-live="polite"` on the caption.

Shared: a `useAsyncAction(fn, { delay: 150, minLoading: 400, hold: 600, timeout: 10000 })` hook in `packages/ui` that returns `{ status, run, error }` and is used by both platforms, so the timings live in one place. Timings are exported from `packages/design-tokens` under `motion` so Figma's motion spec and the code agree.

## Open questions

Whether "Going" should offer a one-tap undo for 5 seconds (a toast with "Undo") instead of the confirmation sheet on tap. Whether the count should animate when other people RSVP while the screen is open (proposal: yes, same digit slide, no haptic). Whether Follow uses the Confirmed moment at all or goes straight to Following (proposal: skip the check for Follow, it is lower ceremony).

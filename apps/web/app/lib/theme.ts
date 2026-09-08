// The theme names, on their own: `root.tsx`'s Layout needs the default, and
// Layout is not a server export, so it cannot reach into the cookie module
// without dragging node:crypto into the client bundle.

export const THEMES = ['marine-layer', 'harbor', 'olive-ivory'] as const;
export type Theme = (typeof THEMES)[number];
export const DEFAULT_THEME: Theme = 'marine-layer';

export function isTheme(value: string | undefined): value is Theme {
  return (THEMES as readonly string[]).includes(value ?? '');
}

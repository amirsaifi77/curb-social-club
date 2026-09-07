// Runtime theme and appearance switching (R-7, R-8) plus a tiny external
// store so screens re-render when the setting changes. The Unistyles theme
// palettes are swapped inside the registered light and dark themes via
// updateTheme, so no navigator remount happens.
import { useSyncExternalStore } from 'react';
import { Appearance } from 'react-native';
import { UnistylesRuntime } from 'react-native-unistyles';

import {
  buildUnistylesTheme,
  readThemeSetting,
  writeThemeSetting,
  type AppearanceSetting,
  type ThemeSetting,
} from './theme';

let current: ThemeSetting = readThemeSetting();
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getThemeSetting(): ThemeSetting {
  return current;
}

function applyAppearance(appearance: AppearanceSetting): void {
  if (appearance === 'system') {
    // Adaptive themes back on; native chrome follows the phone again (R-8).
    // RN 0.86 renamed the null argument to "unspecified".
    UnistylesRuntime.setAdaptiveThemes(true);
    Appearance.setColorScheme('unspecified');
  } else {
    UnistylesRuntime.setAdaptiveThemes(false);
    UnistylesRuntime.setTheme(appearance);
    Appearance.setColorScheme(appearance);
  }
}

export function setThemeSetting(next: Partial<ThemeSetting>): void {
  const previous = current;
  current = { ...current, ...next };
  writeThemeSetting(current);

  if (current.theme !== previous.theme) {
    // Swap palettes inside the two registered themes (R-7).
    UnistylesRuntime.updateTheme('light', () => buildUnistylesTheme(current.theme, 'light'));
    UnistylesRuntime.updateTheme('dark', () => buildUnistylesTheme(current.theme, 'dark'));
  }
  if (current.appearance !== previous.appearance) {
    applyAppearance(current.appearance);
  }
  emit();
}

export function useThemeSetting(): ThemeSetting {
  return useSyncExternalStore(subscribe, getThemeSetting, getThemeSetting);
}

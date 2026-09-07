import {
  defaultTheme,
  getTheme,
  glass,
  motion,
  radius,
  spacing,
  themes,
  typography,
  type Scheme,
  type ThemeName,
} from '@curb/design-tokens';

import { storage, type KeyValueStore } from './storage';

export type AppearanceSetting = 'system' | 'light' | 'dark';

export interface ThemeSetting {
  theme: ThemeName;
  appearance: AppearanceSetting;
}

// MMKV key and default per R-9.
export const THEME_STORAGE_KEY = 'curb.theme';
export const DEFAULT_SETTING: ThemeSetting = { theme: defaultTheme, appearance: 'system' };

const APPEARANCES: readonly AppearanceSetting[] = ['system', 'light', 'dark'];

export function isThemeName(value: unknown): value is ThemeName {
  return typeof value === 'string' && Object.hasOwn(themes, value);
}

export function isAppearance(value: unknown): value is AppearanceSetting {
  return typeof value === 'string' && (APPEARANCES as readonly string[]).includes(value);
}

// Reads { theme, appearance } from MMKV, falling back field by field so a
// corrupt or stale value never blocks first render.
export function readThemeSetting(store: KeyValueStore = storage): ThemeSetting {
  try {
    const raw = store.getString(THEME_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTING;
    const parsed: unknown = JSON.parse(raw);
    const record =
      typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
    return {
      theme: isThemeName(record.theme) ? record.theme : DEFAULT_SETTING.theme,
      appearance: isAppearance(record.appearance) ? record.appearance : DEFAULT_SETTING.appearance,
    };
  } catch {
    return DEFAULT_SETTING;
  }
}

export function writeThemeSetting(setting: ThemeSetting, store: KeyValueStore = storage): void {
  store.set(THEME_STORAGE_KEY, JSON.stringify(setting));
}

// One Unistyles theme per scheme: the selected theme's role colors plus the
// shared non-color token groups (R-6).
export function buildUnistylesTheme(name: ThemeName, scheme: Scheme) {
  return {
    colors: getTheme(name, scheme),
    typography,
    spacing,
    radius,
    glass,
    motion,
  };
}

export type AppTheme = ReturnType<typeof buildUnistylesTheme>;

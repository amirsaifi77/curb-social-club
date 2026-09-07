import { describe, expect, it } from '@jest/globals';

import type { KeyValueStore } from './storage';
import {
  buildUnistylesTheme,
  DEFAULT_SETTING,
  readThemeSetting,
  THEME_STORAGE_KEY,
  writeThemeSetting,
} from './theme';

function fakeStore(initial: Record<string, string> = {}): KeyValueStore {
  const map = new Map(Object.entries(initial));
  return {
    set: (key, value) => void map.set(key, value),
    getString: (key) => map.get(key),
  };
}

describe('readThemeSetting (R-9)', () => {
  it('defaults to marine-layer and system', () => {
    expect(readThemeSetting(fakeStore())).toEqual({ theme: 'marine-layer', appearance: 'system' });
    expect(DEFAULT_SETTING).toEqual({ theme: 'marine-layer', appearance: 'system' });
  });

  it('round-trips a written setting', () => {
    const store = fakeStore();
    writeThemeSetting({ theme: 'harbor', appearance: 'dark' }, store);
    expect(store.getString(THEME_STORAGE_KEY)).toBe('{"theme":"harbor","appearance":"dark"}');
    expect(readThemeSetting(store)).toEqual({ theme: 'harbor', appearance: 'dark' });
  });

  it('falls back field by field on bad values', () => {
    const store = fakeStore({
      [THEME_STORAGE_KEY]: '{"theme":"neon","appearance":"dark"}',
    });
    expect(readThemeSetting(store)).toEqual({ theme: 'marine-layer', appearance: 'dark' });
  });

  it('survives corrupt JSON', () => {
    const store = fakeStore({ [THEME_STORAGE_KEY]: 'not json' });
    expect(readThemeSetting(store)).toEqual(DEFAULT_SETTING);
  });
});

describe('buildUnistylesTheme (R-6)', () => {
  it('carries the theme colors and shared token groups', () => {
    const theme = buildUnistylesTheme('harbor', 'dark');
    expect(theme.colors.accent).toBe('#CBA55B');
    expect(theme.typography.scale.body.size).toBe(16);
    expect(theme.motion.asyncButton.loadingDelay).toBe(150);
    expect(theme.spacing.gutter).toBe(20);
  });

  it('differs between schemes of the same theme', () => {
    expect(buildUnistylesTheme('marine-layer', 'light').colors.bg).toBe('#F3F4F4');
    expect(buildUnistylesTheme('marine-layer', 'dark').colors.bg).toBe('#15181A');
  });
});

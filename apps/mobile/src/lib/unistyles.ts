// Configures Unistyles once at boot (R-6): two registered themes, light and
// dark, each built from the persisted theme selection. Import this module
// before anything that calls StyleSheet.create.
import { StyleSheet } from 'react-native-unistyles';

import { buildUnistylesTheme, readThemeSetting, type AppTheme } from './theme';

declare module 'react-native-unistyles' {
  export interface UnistylesThemes {
    light: AppTheme;
    dark: AppTheme;
  }
}

const setting = readThemeSetting();

StyleSheet.configure({
  themes: {
    light: buildUnistylesTheme(setting.theme, 'light'),
    dark: buildUnistylesTheme(setting.theme, 'dark'),
  },
  settings:
    setting.appearance === 'system'
      ? { adaptiveThemes: true }
      : { initialTheme: setting.appearance },
});

export interface ColorToken {
  $value: string;
  $type: string;
  $description?: string;
}

export interface ThemeSource {
  name: string;
  story: string;
  light: Record<string, ColorToken>;
  dark: Record<string, ColorToken>;
}

export interface TokensSource {
  meta: {
    defaultTheme: string;
    themes: string[];
    schemes: string[];
    roles: string[];
    [key: string]: unknown;
  };
  themes: Record<string, ThemeSource>;
  typography: Record<string, unknown>;
  spacing: Record<string, unknown>;
  radius: Record<string, unknown>;
  glass: Record<string, unknown>;
  motion: Record<string, unknown>;
}

export const SCHEMES = ['light', 'dark'] as const;

// The 22 color roles: the 21 in the package README plus accentPressed (R-3).
export const ROLES = [
  'bg',
  'surface',
  'surfaceRaised',
  'border',
  'textPrimary',
  'textSecondary',
  'accent',
  'accentInk',
  'accentPressed',
  'link',
  'success',
  'warning',
  'error',
  'pinNow',
  'pinToday',
  'pinUpcoming',
  'pinRecurring',
  'pinPast',
  'pinCluster',
  'pinLabel',
  'glassTint',
  'scrim',
] as const;

// Roles carrying alpha as #RRGGBBAA.
export const HEX8_ROLES = ['glassTint', 'scrim'] as const;

export const TEXT_ROLES = ['textPrimary', 'textSecondary', 'link'] as const;
export const TEXT_SURFACES = ['bg', 'surface', 'surfaceRaised'] as const;
export const PIN_FILL_ROLES = [
  'pinNow',
  'pinToday',
  'pinUpcoming',
  'pinRecurring',
  'pinPast',
  'pinCluster',
] as const;

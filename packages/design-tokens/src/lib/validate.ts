import { contrastRatio } from './contrast';
import {
  HEX8_ROLES,
  PIN_FILL_ROLES,
  ROLES,
  SCHEMES,
  TEXT_ROLES,
  TEXT_SURFACES,
  type TokensSource,
} from './types';

const HEX6 = /^#[0-9A-Fa-f]{6}$/;
const HEX8 = /^#[0-9A-Fa-f]{8}$/;

// Contrast floors from docs/specs/design-system-and-theming.md R-3 and
// brand/brand-guide.md section 5: text on surfaces 4.5:1, accentInk on
// accent 5.5:1, pin fills on bg 3:1, pinLabel on each pin fill 3:1.
const TEXT_MIN = 4.5;
const ACCENT_INK_MIN = 5.5;
const PIN_MIN = 3;

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

// Structural schema plus the contrast gate. Returns every problem found;
// an empty array means the file can be built.
export function validateTokens(tokens: TokensSource): string[] {
  const errors: string[] = [];

  for (const section of ['meta', 'themes', 'typography', 'spacing', 'radius', 'glass', 'motion']) {
    if (!(section in tokens) || tokens[section as keyof TokensSource] == null) {
      errors.push(`tokens.json is missing the "${section}" section`);
    }
  }
  if (errors.length > 0) return errors;

  const expectedRoles = [...ROLES];
  const metaRoles = tokens.meta.roles ?? [];
  if (JSON.stringify([...metaRoles].sort()) !== JSON.stringify([...expectedRoles].sort())) {
    errors.push(
      `meta.roles does not list exactly the ${expectedRoles.length} expected color roles`,
    );
  }
  if (!(tokens.meta.defaultTheme in tokens.themes)) {
    errors.push(`meta.defaultTheme "${tokens.meta.defaultTheme}" is not a theme`);
  }
  for (const themeName of tokens.meta.themes ?? []) {
    if (!(themeName in tokens.themes)) {
      errors.push(`meta.themes lists "${themeName}" but themes has no such key`);
    }
  }

  for (const [themeName, theme] of Object.entries(tokens.themes)) {
    for (const scheme of SCHEMES) {
      const set = theme[scheme];
      if (set == null) {
        errors.push(`${themeName}/${scheme} is missing entirely`);
        continue;
      }

      const colors: Record<string, string> = {};
      for (const role of expectedRoles) {
        const token = set[role];
        if (token == null || typeof token.$value !== 'string') {
          errors.push(`${themeName}/${scheme} is missing role "${role}"`);
          continue;
        }
        const wantsAlpha = (HEX8_ROLES as readonly string[]).includes(role);
        const pattern = wantsAlpha ? HEX8 : HEX6;
        if (!pattern.test(token.$value)) {
          errors.push(
            `${themeName}/${scheme} role "${role}" has value "${token.$value}", expected ` +
              (wantsAlpha ? '#RRGGBBAA' : '#RRGGBB'),
          );
          continue;
        }
        colors[role] = token.$value;
      }

      const check = (fg: string, bg: string, min: number) => {
        const a = colors[fg];
        const b = colors[bg];
        if (a == null || b == null) return;
        const ratio = contrastRatio(a, b);
        if (ratio < min) {
          errors.push(`${themeName}/${scheme} ${fg} on ${bg} is ${round(ratio)}:1, needs ${min}:1`);
        }
      };

      for (const text of TEXT_ROLES) {
        for (const surface of TEXT_SURFACES) check(text, surface, TEXT_MIN);
      }
      check('accentInk', 'accent', ACCENT_INK_MIN);
      for (const pin of PIN_FILL_ROLES) {
        check(pin, 'bg', PIN_MIN);
        check('pinLabel', pin, PIN_MIN);
      }
    }
  }

  return errors;
}

// Key-order-insensitive serialization, so a reordered but equal mirror passes.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`);
    return `{${entries.join(',')}}`;
  }
  return JSON.stringify(value);
}

// The package copy is the source; brand/tokens.json mirrors it for the brand
// workstream and the build fails when they drift (session 0.3 notes).
export function checkMirror(tokens: TokensSource, brandTokens: unknown): string[] {
  if (canonical(tokens) === canonical(brandTokens)) return [];
  return [
    'brand/tokens.json does not match packages/design-tokens/tokens.json; ' +
      'the package copy is the source, copy it over the brand mirror',
  ];
}

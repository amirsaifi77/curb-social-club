import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import type { TokensSource } from './types';
import { checkMirror, validateTokens } from './validate';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

function loadTokens(): TokensSource {
  return JSON.parse(readFileSync(join(packageRoot, 'tokens.json'), 'utf8')) as TokensSource;
}

describe('validateTokens', () => {
  it('accepts the committed tokens.json', () => {
    expect(validateTokens(loadTokens())).toEqual([]);
  });

  it('names the theme, scheme, and role when a role is missing (AC-2)', () => {
    const tokens = loadTokens();
    delete tokens.themes['harbor'].dark['accentInk'];
    const errors = validateTokens(tokens);
    expect(errors).toContain('harbor/dark is missing role "accentInk"');
  });

  it('names the failing contrast pair and ratio (AC-2)', () => {
    const tokens = loadTokens();
    tokens.themes['marine-layer'].light['accentInk'].$value = '#888888';
    const errors = validateTokens(tokens);
    const contrastError = errors.find((e) => e.includes('accentInk on accent'));
    expect(contrastError).toMatch(
      /^marine-layer\/light accentInk on accent is \d+(\.\d+)?:1, needs 5\.5:1$/,
    );
  });

  it('fails a text role that drops under 4.5:1 on a surface', () => {
    const tokens = loadTokens();
    tokens.themes['olive-ivory'].light['textSecondary'].$value = '#AAAAAA';
    const errors = validateTokens(tokens);
    expect(errors.some((e) => e.startsWith('olive-ivory/light textSecondary on'))).toBe(true);
  });

  it('fails a pin fill that drops under 3:1 on bg', () => {
    const tokens = loadTokens();
    tokens.themes['marine-layer'].light['pinPast'].$value = '#DDDDDD';
    const errors = validateTokens(tokens);
    expect(errors.some((e) => e.includes('pinPast on bg'))).toBe(true);
  });

  it('fails pinLabel that drops under 3:1 on a pin fill', () => {
    const tokens = loadTokens();
    tokens.themes['marine-layer'].light['pinLabel'].$value = '#2E6B51';
    const errors = validateTokens(tokens);
    expect(errors.some((e) => e.includes('pinLabel on pinNow'))).toBe(true);
  });

  it('rejects a malformed hex and a hex6 where hex8 is required', () => {
    const tokens = loadTokens();
    tokens.themes['harbor'].light['bg'].$value = 'fog';
    tokens.themes['harbor'].light['glassTint'].$value = '#FFFFFF';
    const errors = validateTokens(tokens);
    expect(errors.some((e) => e.includes('role "bg" has value "fog"'))).toBe(true);
    expect(errors.some((e) => e.includes('role "glassTint"'))).toBe(true);
  });
});

describe('checkMirror', () => {
  it('passes when brand/tokens.json equals the package copy', () => {
    const tokens = loadTokens();
    const brand = JSON.parse(
      readFileSync(join(packageRoot, '..', '..', 'brand', 'tokens.json'), 'utf8'),
    );
    expect(checkMirror(tokens, brand)).toEqual([]);
  });

  it('ignores key order but not values', () => {
    const tokens = loadTokens();
    const reordered = Object.fromEntries(Object.entries(tokens).reverse());
    expect(checkMirror(tokens, reordered)).toEqual([]);
    const drifted = loadTokens();
    drifted.themes['harbor'].light['accent'].$value = '#000000';
    expect(checkMirror(tokens, drifted)).toHaveLength(1);
  });
});

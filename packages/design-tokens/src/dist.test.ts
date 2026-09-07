// File assertions on dist/ (AC-1, AC-3, AC-4). The build task runs before
// test via this package's turbo.json; running vitest alone requires a prior
// pnpm --filter @curb/design-tokens build.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { defaultTheme, getTheme, motion, themes, typography } from '../dist/tokens';
import type { TokensSource } from './lib/types';

const packageRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(packageRoot, 'dist');

describe('dist outputs (AC-1)', () => {
  it('emits all three files', () => {
    for (const file of ['tokens.ts', 'tokens.css', 'tailwind.theme.js']) {
      expect(existsSync(join(dist, file)), file).toBe(true);
    }
  });
});

describe('getTheme (AC-3)', () => {
  it('falls back to Marine Layer light for unknown name and scheme', () => {
    expect(getTheme('nope', 'sideways')).toEqual(themes['marine-layer'].light);
    expect(defaultTheme).toBe('marine-layer');
  });

  it('resolves harbor dark accent', () => {
    expect(getTheme('harbor', 'dark').accent).toBe('#CBA55B');
  });

  it('exports the non-color token groups', () => {
    expect(Object.keys(typography.scale)).toContain('plate');
    expect(motion.asyncButton.loadingDelay).toBe(150);
  });
});

describe('tokens.css (AC-4)', () => {
  const css = readFileSync(join(dist, 'tokens.css'), 'utf8');

  it('sets :root to Marine Layer light', () => {
    expect(css).toContain(':root{--color-bg:#F3F4F4');
  });

  it('switches :root to Marine Layer dark under prefers-color-scheme', () => {
    const media = css.split('\n').find((l) => l.startsWith('@media (prefers-color-scheme: dark)'));
    expect(media).toBeDefined();
    expect(media).toContain('--color-bg:#15181A');
  });

  it('addresses every variant and defines the font variables', () => {
    expect(css).toContain('[data-theme="olive-ivory"][data-scheme="dark"]');
    expect(css).toContain('--font-display:');
    expect(css).toContain('--font-ui:');
  });
});

describe('build CLI (AC-2)', () => {
  const tsx = join(packageRoot, 'node_modules', '.bin', 'tsx');

  function runBuild(mutate: (tokens: TokensSource) => void): {
    status: number | null;
    stderr: string;
  } {
    const tokens = JSON.parse(
      readFileSync(join(packageRoot, 'tokens.json'), 'utf8'),
    ) as TokensSource;
    mutate(tokens);
    const fixture = join(mkdtempSync(join(tmpdir(), 'curb-tokens-')), 'tokens.json');
    writeFileSync(fixture, JSON.stringify(tokens));
    const result = spawnSync(tsx, ['build.ts', fixture], { cwd: packageRoot, encoding: 'utf8' });
    return { status: result.status, stderr: result.stderr };
  }

  it('exits 1 naming theme, scheme, and role for a missing role', () => {
    const { status, stderr } = runBuild((tokens) => {
      delete tokens.themes['harbor'].dark['accentInk'];
    });
    expect(status).toBe(1);
    expect(stderr).toContain('harbor/dark is missing role "accentInk"');
  });

  it('exits 1 naming the pair and ratio for a contrast failure', () => {
    const { status, stderr } = runBuild((tokens) => {
      tokens.themes['marine-layer'].light['accentInk'].$value = '#888888';
    });
    expect(status).toBe(1);
    expect(stderr).toMatch(/marine-layer\/light accentInk on accent is [\d.]+:1, needs 5\.5:1/);
  });
});

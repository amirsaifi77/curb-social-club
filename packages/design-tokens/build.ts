// Token build: validates tokens.json (schema, contrast gate, brand mirror)
// and emits dist/tokens.ts, dist/tokens.css, dist/tailwind.theme.js.
// Run with tsx (pnpm --filter @curb/design-tokens build).
//
// An optional argv path builds a different tokens file (used by the test
// suite to prove bad fixtures fail); the brand mirror check only applies to
// the canonical tokens.json.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  emitTailwindTheme,
  emitTailwindThemeDts,
  emitTokensCss,
  emitTokensTs,
} from './src/lib/emit';
import type { TokensSource } from './src/lib/types';
import { checkMirror, validateTokens } from './src/lib/validate';

const packageRoot = dirname(fileURLToPath(import.meta.url));
const canonicalPath = join(packageRoot, 'tokens.json');
const tokensPath = process.argv[2] ? resolve(process.argv[2]) : canonicalPath;

const tokens = JSON.parse(readFileSync(tokensPath, 'utf8')) as TokensSource;

const errors = validateTokens(tokens);
if (tokensPath === canonicalPath) {
  const brandPath = join(packageRoot, '..', '..', 'brand', 'tokens.json');
  errors.push(...checkMirror(tokens, JSON.parse(readFileSync(brandPath, 'utf8'))));
}

if (errors.length > 0) {
  for (const error of errors) console.error(`tokens: ${error}`);
  console.error(`tokens: ${errors.length} problem(s), nothing written`);
  process.exit(1);
}

const dist = join(packageRoot, 'dist');
mkdirSync(dist, { recursive: true });
writeFileSync(join(dist, 'tokens.ts'), emitTokensTs(tokens));
writeFileSync(join(dist, 'tokens.css'), emitTokensCss(tokens));
writeFileSync(join(dist, 'tailwind.theme.js'), emitTailwindTheme(tokens));
writeFileSync(join(dist, 'tailwind.theme.d.ts'), emitTailwindThemeDts());
console.log('tokens: wrote dist/tokens.ts, dist/tokens.css, dist/tailwind.theme.js (+ .d.ts)');

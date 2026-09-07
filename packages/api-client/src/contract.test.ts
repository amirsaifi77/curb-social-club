import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { endpoints } from './endpoints';

// Reads the committed openapi-typescript output and checks that every
// operation the client wraps is declared there with a real method (an
// absent method is emitted as `get?: never`). Fails when the spec drops or
// renames an endpoint before the client notices.
const generated = readFileSync(
  fileURLToPath(new URL('../../types/src/generated.d.ts', import.meta.url)),
  'utf8',
);

function operationBlock(path: string): string | null {
  const header = `    "${path}": {\n`;
  const start = generated.indexOf(header);
  if (start === -1) return null;
  const rest = generated.slice(start + header.length);
  const next = rest.search(/^ {4}"\//m);
  return next === -1 ? rest : rest.slice(0, next);
}

describe('client and spec agree', () => {
  it.each(Object.entries(endpoints))('%s is a real operation', (_name, endpoint) => {
    const block = operationBlock(endpoint.path);
    expect(block, `${endpoint.path} missing from generated.d.ts`).not.toBeNull();
    expect(block, `${endpoint.method} ${endpoint.path} missing`).toMatch(
      new RegExp(`^ {8}${endpoint.method}: \\{`, 'm'),
    );
  });

  it('lists every path the spec declares, so a new endpoint gets a wrapper', () => {
    const declared = [...generated.matchAll(/^ {4}"(\/v1[^"]*)": \{$/gm)].map((m) => m[1]);
    const wrapped = new Set<string>(Object.values(endpoints).map((e) => e.path));
    expect(declared.filter((path) => !wrapped.has(path))).toEqual([]);
  });
});

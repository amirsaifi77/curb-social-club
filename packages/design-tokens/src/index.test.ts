import { describe, expect, it } from 'vitest';

import { packageName } from './index';

describe('@curb/design-tokens', () => {
  it('exports the package name placeholder', () => {
    expect(packageName).toBe('@curb/design-tokens');
  });
});

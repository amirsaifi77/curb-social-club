import { describe, expect, it } from 'vitest';

import { packageName } from './index';

describe('@curb/ui', () => {
  it('exports the package name placeholder', () => {
    expect(packageName).toBe('@curb/ui');
  });
});

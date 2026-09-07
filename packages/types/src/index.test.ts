import { describe, expect, it } from 'vitest';

import { packageName } from './index';

describe('@curb/types', () => {
  it('exports the package name placeholder', () => {
    expect(packageName).toBe('@curb/types');
  });
});

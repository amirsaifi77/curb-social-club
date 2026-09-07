import { describe, expect, it } from 'vitest';

import { packageName } from './index';

describe('@curb/api-client', () => {
  it('exports the package name placeholder', () => {
    expect(packageName).toBe('@curb/api-client');
  });
});

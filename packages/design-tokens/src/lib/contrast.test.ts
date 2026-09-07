import { describe, expect, it } from 'vitest';

import { contrastRatio, relativeLuminance } from './contrast';

describe('contrastRatio', () => {
  it('measures black on white at 21:1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
  });

  it('is symmetric', () => {
    expect(contrastRatio('#0E2A47', '#F3F4F4')).toBeCloseTo(contrastRatio('#F3F4F4', '#0E2A47'));
  });

  it('matches the brand guide table for Lido Blue on fog white', () => {
    // brand/brand-guide.md section 5: accent #0E2A47 on bg #F3F4F4 is 13.2:1.
    expect(contrastRatio('#0E2A47', '#F3F4F4')).toBeCloseTo(13.2, 1);
  });

  it('measures hex8 values by their opaque component', () => {
    expect(relativeLuminance('#FFFFFFA6')).toBeCloseTo(relativeLuminance('#FFFFFF'));
  });

  it('rejects non-hex input', () => {
    expect(() => relativeLuminance('blue')).toThrow(/not a hex color/);
  });
});

import { describe, expect, it } from '@jest/globals';

import { fontFamilyFor, maxFontSizeMultiplierFor, variantStyle } from './Text';

describe('Text variant styles (R-12)', () => {
  it('maps the display family to the serif and ui weights to Geist files', () => {
    expect(fontFamilyFor('display', 400)).toBe('InstrumentSerif-Regular');
    expect(fontFamilyFor('ui', 400)).toBe('Geist-Regular');
    expect(fontFamilyFor('ui', 500)).toBe('Geist-Medium');
    expect(fontFamilyFor('ui', 600)).toBe('Geist-SemiBold');
  });

  it('applies tnum and uppercase to plate, uppercase to label', () => {
    const plate = variantStyle('plate');
    expect(plate.fontVariant).toEqual(['tabular-nums']);
    expect(plate.textTransform).toBe('uppercase');
    const label = variantStyle('label');
    expect(label.textTransform).toBe('uppercase');
    expect(variantStyle('body').textTransform).toBeUndefined();
  });

  it('caps Dynamic Type at 1.5 for display and title, 2.0 otherwise', () => {
    expect(maxFontSizeMultiplierFor('display')).toBe(1.5);
    expect(maxFontSizeMultiplierFor('title')).toBe(1.5);
    expect(maxFontSizeMultiplierFor('body')).toBe(2.0);
    expect(maxFontSizeMultiplierFor('label')).toBe(2.0);
  });

  it('uses the serif only for display, title, and headline (R-13)', () => {
    for (const variant of ['display', 'title', 'headline'] as const) {
      expect(variantStyle(variant).fontFamily).toBe('InstrumentSerif-Regular');
    }
    for (const variant of ['subhead', 'body', 'caption', 'plate', 'label'] as const) {
      expect(variantStyle(variant).fontFamily).toMatch(/^Geist-/);
    }
  });
});

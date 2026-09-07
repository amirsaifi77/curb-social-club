import { typography } from '@curb/design-tokens';
import { Text as RNText, type TextProps as RNTextProps, type TextStyle } from 'react-native';
import { useUnistyles } from 'react-native-unistyles';

// Exactly the eight styles in typography.scale (R-12).
export type TextVariant = keyof typeof typography.scale;

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: 'primary' | 'secondary';
}

// Loaded font file per family and weight; the subsets ship in
// packages/design-tokens/fonts (R-11). The serif has one weight.
export function fontFamilyFor(family: string, weight: number): string {
  if (family === 'display') return 'InstrumentSerif-Regular';
  if (weight >= 600) return 'Geist-SemiBold';
  if (weight >= 500) return 'Geist-Medium';
  return 'Geist-Regular';
}

// Static (theme-independent) part of a variant's style; exported for tests.
export function variantStyle(variant: TextVariant): TextStyle {
  const scale = typography.scale[variant];
  const features: readonly string[] = 'features' in scale ? scale.features : [];
  const style: TextStyle = {
    fontFamily: fontFamilyFor(scale.family, scale.weight),
    fontSize: scale.size,
    lineHeight: scale.lineHeight,
    letterSpacing: scale.tracking,
    fontVariant: features.includes('tnum') ? ['tabular-nums'] : undefined,
    textTransform:
      'transform' in scale && scale.transform === 'uppercase' ? 'uppercase' : undefined,
  };
  return style;
}

// Dynamic Type: headlines scale less than body copy (R-12).
export function maxFontSizeMultiplierFor(variant: TextVariant): number {
  return variant === 'display' || variant === 'title' ? 1.5 : 2.0;
}

export function Text({ variant = 'body', color = 'primary', style, ...rest }: TextProps) {
  const { theme } = useUnistyles();
  const themed: TextStyle = {
    color: color === 'secondary' ? theme.colors.textSecondary : theme.colors.textPrimary,
  };
  return (
    <RNText
      {...rest}
      maxFontSizeMultiplier={maxFontSizeMultiplierFor(variant)}
      style={[variantStyle(variant), themed, style]}
    />
  );
}

// The one place glass and blur render from (R-14); everywhere else imports
// Surface, enforced by no-restricted-imports in eslint.config.js.
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { View, type ViewProps } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

export type SurfaceMaterial = 'glass' | 'blur' | 'solid';

export interface SurfaceProps extends ViewProps {
  material?: SurfaceMaterial;
}

// Material tiers per docs/mobile-liquid-glass.md section 4: real glass on
// iOS 26, blur where glass is unavailable, and a solid raised surface as the
// universal fallback. Content surfaces stay solid; glass is chrome only.
export function Surface({ material = 'solid', style, children, ...rest }: SurfaceProps) {
  const { theme } = useUnistyles();

  if (material === 'glass' && isLiquidGlassAvailable()) {
    return (
      <GlassView glassEffectStyle="regular" style={style} {...rest}>
        {children}
      </GlassView>
    );
  }

  if (material === 'glass' || material === 'blur') {
    return (
      <BlurView intensity={40} tint="default" style={[styles.blur, style]} {...rest}>
        {children}
      </BlurView>
    );
  }

  return (
    <View style={[{ backgroundColor: theme.colors.surfaceRaised }, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  blur: {
    overflow: 'hidden',
  },
});

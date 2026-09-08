// The one place glass and blur render from (R-14); everywhere else imports
// Surface, enforced by no-restricted-imports in eslint.config.js.
import { BlurView } from 'expo-blur';
import { GlassContainer, GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { View, type ViewProps } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

export type SurfaceMaterial = 'glass' | 'blur' | 'solid';

export interface SurfaceGroupProps extends ViewProps {
  /** Distance at which neighbouring glass merges (expo-glass-effect). */
  spacing?: number;
}

// Neighbouring glass controls belong in one container: Apple says it
// optimizes performance and lets them morph together, and it is the only
// sanctioned way to group glass (docs/mobile-liquid-glass.md sections 2.3
// and 4). Off iOS 26 it is a plain row, so the layout is identical and only
// the material differs.
export function SurfaceGroup({ spacing = 12, style, children, ...rest }: SurfaceGroupProps) {
  if (isLiquidGlassAvailable()) {
    return (
      <GlassContainer spacing={spacing} style={style} {...rest}>
        {children}
      </GlassContainer>
    );
  }

  return (
    <View style={style} {...rest}>
      {children}
    </View>
  );
}

export interface SurfaceProps extends ViewProps {
  material?: SurfaceMaterial;
  /** A control rather than a backdrop: glass reacts to touch. */
  interactive?: boolean;
}

// Material tiers per docs/mobile-liquid-glass.md section 4: real glass on
// iOS 26, blur where glass is unavailable, and a solid raised surface as the
// universal fallback. Content surfaces stay solid; glass is chrome only.
export function Surface({
  material = 'solid',
  interactive = false,
  style,
  children,
  ...rest
}: SurfaceProps) {
  const { theme } = useUnistyles();

  if (material === 'glass' && isLiquidGlassAvailable()) {
    return (
      <GlassView glassEffectStyle="regular" isInteractive={interactive} style={style} {...rest}>
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

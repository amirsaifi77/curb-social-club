import { typography } from '@curb/design-tokens';
import { Redirect } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Surface, type SurfaceMaterial } from '@/ui/Surface';
import { Text, type TextVariant } from '@/ui/Text';

const VARIANTS = Object.keys(typography.scale) as TextVariant[];
const MATERIALS: SurfaceMaterial[] = ['glass', 'blur', 'solid'];

// S40 dev-only component gallery for the device QA (R-19). PrimaryButton
// statuses join in session 0.10. Not routable in release builds.
export default function GalleryScreen() {
  if (!__DEV__) {
    return <Redirect href="/+not-found" />;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text variant="label" color="secondary">
        Text
      </Text>
      {VARIANTS.map((variant) => (
        <Text key={variant} variant={variant}>
          {variant} 7:30 AM
        </Text>
      ))}

      <Text variant="label" color="secondary" style={styles.section}>
        Surface
      </Text>
      {MATERIALS.map((material) => (
        <Surface key={material} material={material} style={styles.surface}>
          <View style={styles.surfaceInner}>
            <Text variant="caption">{material}</Text>
          </View>
        </Surface>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    padding: theme.spacing.gutter,
    paddingBottom: theme.spacing.tabBarInset,
    gap: theme.spacing['2'],
  },
  section: {
    marginTop: theme.spacing['4'],
  },
  surface: {
    borderRadius: theme.radius.card,
  },
  surfaceInner: {
    padding: theme.spacing['4'],
  },
}));

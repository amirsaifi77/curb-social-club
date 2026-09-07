import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from '@/ui/Text';

// S03 Map skeleton: Apple Maps and pins arrive in Phase 1 (session 1.12).
export default function MapScreen() {
  return (
    <View style={styles.screen}>
      <Text variant="headline">Map</Text>
      <Text color="secondary" style={styles.caption}>
        The map arrives in Phase 1.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.bg,
    gap: theme.spacing['2'],
  },
  caption: {},
}));

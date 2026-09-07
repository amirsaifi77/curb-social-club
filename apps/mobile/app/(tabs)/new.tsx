import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from '@/ui/Text';

// S06 Create skeleton: paste a link or add the details (Phase 2 and 3).
export default function CreateScreen() {
  return (
    <View style={styles.screen}>
      <Text variant="headline">Create</Text>
      <Text color="secondary" style={styles.caption}>
        Paste a link or add the details. Arrives in Phase 2.
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
  caption: {
    paddingHorizontal: theme.spacing.gutter,
    textAlign: 'center',
  },
}));

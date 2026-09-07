import { ScrollView } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from '@/ui/Text';

// S02 Home skeleton: Phase 0 placeholder for the sectioned feed
// (discovery.md owns the behavior).
export default function HomeScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text variant="display">This weekend</Text>
      <Text color="secondary" style={styles.caption}>
        Meets near you arrive in Phase 1.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    paddingTop: rt.insets.top + theme.spacing['8'],
    paddingHorizontal: theme.spacing.gutter,
    paddingBottom: theme.spacing.tabBarInset,
  },
  caption: {
    marginTop: theme.spacing['2'],
  },
}));

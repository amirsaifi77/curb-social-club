import { Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from '@/ui/Text';

// S09 as the Phase 1 stub the session block asks for: the "Next dates" rows
// have somewhere to go, and the full screen (counts, going preview, the
// CTA) lands with the RSVP slice. The id is shown so a deep link to an
// occurrence is visibly the right one.
export default function OccurrenceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Date' }} />
      <Text variant="body" color="secondary">
        This date opens with RSVPs in Phase 2.
      </Text>
      <Text variant="caption" color="secondary">
        {id}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    padding: theme.spacing.gutter,
    paddingTop: rt.insets.top + theme.spacing['16'],
    gap: theme.spacing['2'],
  },
}));

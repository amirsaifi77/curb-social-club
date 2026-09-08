import { useOccurrence } from '@curb/api-client';
import { Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { dayAndTime } from '@/components/format';
import { DETAIL_COPY, cancelledBanner } from '@/features/meet-detail/copy';
import { Text } from '@/ui/Text';

// S09 as the Phase 1 stub the session block asks for: it shows the date, so
// a "Next dates" row and a curb://occurrences/:id link both land somewhere
// that says which date they mean. The counts, the going preview and the CTA
// arrive with the RSVP slice.
export default function OccurrenceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const occurrence = useOccurrence(id);

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: 'Date' }} />

      {occurrence.isError ? (
        <Text variant="body">{DETAIL_COPY.error}</Text>
      ) : occurrence.data ? (
        <>
          <Text variant="title">
            {dayAndTime(occurrence.data.starts_at, occurrence.data.timezone)}
          </Text>
          <Text variant="body" color="secondary">
            {occurrence.data.event.title}
          </Text>
          {occurrence.data.status === 'cancelled' ? (
            <Text variant="body" accessibilityRole="alert">
              {cancelledBanner(occurrence.data.override_note)}
            </Text>
          ) : null}
          {/* R-21: a date that has been and gone says so. */}
          {occurrence.data.status === 'completed' ? (
            <Text variant="caption" color="secondary">
              {DETAIL_COPY.occurrenceEnded}
            </Text>
          ) : null}
        </>
      ) : (
        <Text variant="body" color="secondary" accessibilityRole="progressbar">
          Loading this date.
        </Text>
      )}

      <Text variant="caption" color="secondary">
        RSVPs open in Phase 2.
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

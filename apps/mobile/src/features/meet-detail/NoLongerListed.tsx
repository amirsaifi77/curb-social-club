import type { EventSummary } from '@curb/api-client';
import { ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { DETAIL_COPY } from './copy';

import { EventCard } from '@/components/EventCard';
import { Text } from '@/ui/Text';

// R-20 and AC-15: a 410 or 404 is a page, not an error. The navigation
// chrome stays usable and the body's nearby meets render as ordinary cards,
// so the screen offers somewhere to go rather than a dead end.
export function NoLongerListed({ nearby }: { nearby: unknown[] }) {
  const cards = nearby.filter(isEventSummary);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text variant="title">{DETAIL_COPY.noLongerListed}</Text>

      {cards.length > 0 ? (
        <View style={styles.nearby}>
          <Text variant="headline" accessibilityRole="header">
            {DETAIL_COPY.nearbyHeader}
          </Text>
          {cards.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

// The body of an error response is not the contract the client is typed
// against, so a row that cannot be drawn is dropped rather than throwing on
// a page whose whole job is to be a soft landing.
function isEventSummary(row: unknown): row is EventSummary {
  if (typeof row !== 'object' || row === null) return false;
  const value = row as Record<string, unknown>;
  return typeof value.id === 'string' && typeof value.venue === 'object' && value.venue !== null;
}

const styles = StyleSheet.create((theme, rt) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    padding: theme.spacing.gutter,
    paddingTop: rt.insets.top + theme.spacing['16'],
    paddingBottom: rt.insets.bottom + theme.spacing['8'],
    gap: theme.spacing['6'],
  },
  nearby: {
    gap: theme.spacing['4'],
  },
}));

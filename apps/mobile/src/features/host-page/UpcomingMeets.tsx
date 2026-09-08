import type { EventSummary } from '@curb/api-client';
import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { EventCard } from '@/components/EventCard';
import { Text } from '@/ui/Text';

// clubs R-15 and sponsors R-15: up to three meets, then "See all" into the
// filtered list. The sponsor page labels each row "Hosts" or "Sponsors"
// from `relation`; the club and profile pages have one relation and no
// label to draw.

export const UPCOMING_LIMIT = 3;

export interface UpcomingMeetsProps {
  title: string;
  events: readonly (EventSummary & { relation?: string })[];
  emptyCopy: string;
  /** "See all meets": the filtered list this page's meets live in. */
  seeAllHref?: string;
  seeAllLabel?: string;
  /** Sponsor pages only (sponsors R-15). */
  relationLabelFor?: (relation: string) => string;
}

export function UpcomingMeets({
  title,
  events,
  emptyCopy,
  seeAllHref,
  seeAllLabel,
  relationLabelFor,
}: UpcomingMeetsProps) {
  const shown = events.slice(0, UPCOMING_LIMIT);

  return (
    <View style={styles.block}>
      <Text variant="headline" accessibilityRole="header">
        {title}
      </Text>

      {shown.length === 0 ? (
        <Text variant="body" color="secondary">
          {emptyCopy}
        </Text>
      ) : (
        shown.map((event) => (
          <View key={event.id} style={styles.row}>
            {relationLabelFor && event.relation ? (
              <Text variant="caption" color="secondary">
                {relationLabelFor(event.relation)}
              </Text>
            ) : null}
            <EventCard event={event} />
          </View>
        ))
      )}

      {seeAllHref && shown.length > 0 ? (
        // Link asChild clones its child with onPress, which a View drops.
        <Link href={seeAllHref} asChild>
          <Pressable accessibilityRole="link" accessibilityLabel={seeAllLabel ?? 'See all meets'}>
            <Text variant="body" color="secondary">
              {seeAllLabel ?? 'See all meets'}
            </Text>
          </Pressable>
        </Link>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  block: {
    paddingHorizontal: theme.spacing.gutter,
    gap: theme.spacing['3'],
  },
  row: {
    gap: theme.spacing['2'],
  },
}));

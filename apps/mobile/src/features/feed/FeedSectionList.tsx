import { FlashList } from '@shopify/flash-list';
import { RefreshControl, ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { RenderableSection } from './sections';

import { EventCard } from '@/components/EventCard';
import { HostRowCard, toHostRowCard } from '@/components/HostRowCard';
import { Text } from '@/ui/Text';


// S02: a FlashList of sections in API order, so scroll-to-top and the tab
// bar's minimize behaviour work (docs/mobile-liquid-glass.md section 6).
export function FeedSectionList({
  sections,
  refreshing,
  onRefresh,
  header,
}: {
  sections: RenderableSection[];
  refreshing: boolean;
  onRefresh: () => void;
  header?: React.ReactElement | null;
}) {
  return (
    <FlashList
      data={sections}
      keyExtractor={(section) => section.kind}
      ListHeaderComponent={header}
      contentContainerStyle={styles.content}
      // Lets the native large title collapse as the feed scrolls.
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      renderItem={({ item }) => <FeedSectionGroup section={item} />}
    />
  );
}

function FeedSectionGroup({ section }: { section: RenderableSection }) {
  return (
    <View style={styles.section}>
      {/* The title is the section's heading, so VoiceOver's rotor can jump
          between sections while the cards inside stay individually reachable. */}
      <Text variant="headline" accessibilityRole="header">
        {section.title}
      </Text>

      {section.layout === 'events' ? (
        <View style={styles.cards}>
          {section.items.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
        >
          {section.items.map((item) => (
            <HostRowCard
              key={item.id}
              {...toHostRowCard(item, section.layout === 'clubs' ? 'club' : 'sponsor')}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  content: {
    paddingHorizontal: theme.spacing.gutter,
    paddingBottom: rt.insets.bottom + theme.spacing.tabBarInset,
  },
  section: {
    gap: theme.spacing['3'],
    paddingVertical: theme.spacing['4'],
  },
  cards: {
    gap: theme.spacing['4'],
  },
  row: {
    gap: theme.spacing['3'],
    paddingVertical: theme.spacing['1'],
  },
}));

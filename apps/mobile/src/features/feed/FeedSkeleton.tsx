import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

// docs/screens.md Standard states: "Skeleton that matches the final layout.
// Never a full-screen spinner." Five cards, the count discovery.md names for
// S02, in the shape EventCard settles into: cover, title, two meta lines.
export const SKELETON_CARDS = 5;

export function FeedSkeleton({ count = SKELETON_CARDS }: { count?: number }) {
  return (
    <View style={styles.list} accessibilityRole="progressbar" accessibilityLabel="Loading meets">
      <View style={[styles.block, styles.sectionTitle]} />
      {Array.from({ length: count }, (_, index) => (
        <View key={index} style={styles.card}>
          <View style={styles.cover} />
          <View style={styles.body}>
            <View style={[styles.block, styles.title]} />
            <View style={[styles.block, styles.line]} />
            <View style={[styles.block, styles.lineShort]} />
          </View>
        </View>
      ))}
    </View>
  );
}

// Flat rendering: solid fills and a hairline, no shimmer gradient
// (brand-guide.md section 6).
const styles = StyleSheet.create((theme) => ({
  list: {
    gap: theme.spacing['4'],
  },
  block: {
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.button,
  },
  sectionTitle: {
    height: 22,
    width: '45%',
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: theme.radius.hairline,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  cover: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: theme.colors.surfaceRaised,
  },
  body: {
    padding: theme.spacing['4'],
    gap: theme.spacing['2'],
  },
  title: {
    height: 24,
    width: '70%',
  },
  line: {
    height: 16,
    width: '55%',
  },
  lineShort: {
    height: 16,
    width: '40%',
  },
}));

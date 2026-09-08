import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

// R-25: a universal link or a curb:// link lands on S08 before the fetch
// resolves, and docs/screens.md Standard states asks for a skeleton that
// matches the final layout, never a spinner. Flat blocks, no shimmer.
export function MeetSkeleton() {
  return (
    <View style={styles.screen} accessibilityRole="progressbar" accessibilityLabel="Loading this meet">
      <View style={styles.hero} />
      <View style={styles.blocks}>
        <View style={[styles.line, styles.title]} />
        <View style={[styles.line, styles.wide]} />
        <View style={[styles.line, styles.narrow]} />
        <View style={styles.rule} />
        <View style={[styles.line, styles.title]} />
        <View style={[styles.line, styles.wide]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  hero: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: theme.colors.surfaceRaised,
  },
  blocks: {
    padding: theme.spacing.gutter,
    gap: theme.spacing['3'],
  },
  line: {
    height: 18,
    borderRadius: theme.radius.button,
    backgroundColor: theme.colors.surfaceRaised,
  },
  title: {
    height: 26,
    width: '60%',
  },
  wide: {
    width: '85%',
  },
  narrow: {
    width: '45%',
  },
  rule: {
    height: theme.radius.hairline,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing['4'],
  },
}));

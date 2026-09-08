import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from '@/ui/Text';
import { TextButton } from '@/ui/TextButton';

// discovery R-14 and Copy: the offline banner sits above the cached feed
// rather than replacing it, so saved results stay readable.
export const OFFLINE_BANNER = 'Showing saved results.';
export const ERROR_COPY = "Couldn't load the feed.";
export const RETRY_ACTION = 'Try again';

export function OfflineBanner() {
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text variant="caption">{OFFLINE_BANNER}</Text>
    </View>
  );
}

export function FeedError({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.error}>
      <Text variant="body">{ERROR_COPY}</Text>
      <TextButton label={RETRY_ACTION} emphasis="accent" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  banner: {
    paddingVertical: theme.spacing['2'],
    paddingHorizontal: theme.spacing['3'],
    borderRadius: theme.radius.sm,
    borderWidth: theme.radius.hairline,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceRaised,
    marginBottom: theme.spacing['3'],
  },
  error: {
    gap: theme.spacing['4'],
    paddingVertical: theme.spacing['8'],
  },
}));

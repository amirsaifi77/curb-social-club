import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { HOST_PAGE_COPY } from './copy';

import { Text } from '@/ui/Text';
import { TextButton } from '@/ui/TextButton';

// The states every host page shares (docs/screens.md standard states).
// A hidden club or sponsor and a missing handle are 404s: a neutral page in
// the host's own words, never an error with a retry that cannot succeed.

export function NotListed({ copy }: { copy: string }) {
  return (
    <View style={styles.state}>
      <Text variant="body">{copy}</Text>
    </View>
  );
}

export function HostPageError({
  copy,
  action,
  onRetry,
}: {
  copy: string;
  action: string;
  onRetry: () => void;
}) {
  return (
    <View style={styles.state}>
      <Text variant="body">{copy}</Text>
      <TextButton label={action} emphasis="accent" onPress={onRetry} />
    </View>
  );
}

// S13's own loading state (docs/screens.md lists it). Rows of the shape the
// members list ends up with, not a blank screen while the first page flies.
export function MemberListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <View accessibilityLabel={HOST_PAGE_COPY.loading} style={styles.memberList}>
      {Array.from({ length: rows }, (_, index) => (
        <View key={index} style={styles.memberRow}>
          <View style={[styles.memberAvatar, styles.block]} />
          <View style={styles.memberNames}>
            <View style={[styles.lineShort, styles.block]} />
          </View>
        </View>
      ))}
    </View>
  );
}

// A skeleton of the layout, not a spinner: banner, avatar, name, two rows.
export function HostPageSkeleton() {
  return (
    <View accessibilityLabel={HOST_PAGE_COPY.loading} style={styles.skeleton}>
      <View style={styles.banner} />
      <View style={styles.body}>
        <View style={[styles.avatar, styles.block]} />
        <View style={[styles.line, styles.block]} />
        <View style={[styles.lineShort, styles.block]} />
        <View style={[styles.card, styles.block]} />
        <View style={[styles.card, styles.block]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  state: {
    padding: theme.spacing.gutter,
    gap: theme.spacing['3'],
  },
  skeleton: {
    gap: theme.spacing['3'],
  },
  banner: {
    width: '100%',
    aspectRatio: 3,
    backgroundColor: theme.colors.surfaceRaised,
  },
  body: {
    paddingHorizontal: theme.spacing.gutter,
    gap: theme.spacing['3'],
  },
  block: {
    backgroundColor: theme.colors.surfaceRaised,
    borderRadius: theme.radius.sm,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: theme.radius.pill,
    marginTop: -theme.spacing['8'],
  },
  line: { height: 28, width: '70%' },
  lineShort: { height: 16, width: '40%' },
  card: { height: 120, borderRadius: theme.radius.card },
  memberList: {
    paddingHorizontal: theme.spacing.gutter,
    paddingVertical: theme.spacing['3'],
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing['3'],
    paddingVertical: theme.spacing['2'],
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.pill,
  },
  memberNames: {
    flex: 1,
  },
}));

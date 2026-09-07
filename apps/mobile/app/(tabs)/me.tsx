import { Link, router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { useAuth } from '@/lib/auth';
import { Text } from '@/ui/Text';

// S07 Me. Signed out: sign in (opens S26 with no pending action) and
// Settings. Signed in: the profile header; garage and follows arrive in
// Phase 2 (profiles-and-follow.md).
export default function MeScreen() {
  const { status, user, stale } = useAuth();
  // A stored token means signed in, even while GET /me refreshes (R-25).
  const signedIn = status !== 'signedOut';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text variant="title">{signedIn && user ? user.profile.display_name : 'Me'}</Text>

      {signedIn ? (
        <View style={styles.card}>
          <Text>{user ? `@${user.profile.handle}` : 'Signed in'}</Text>
          <Text variant="caption" color="secondary">
            {stale
              ? 'Showing what this phone remembers. Reconnect to refresh.'
              : 'Your garage and follows arrive soon.'}
          </Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text>Sign in to RSVP, follow, and post.</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/sign-in')}
            style={styles.signIn}
          >
            <Text variant="subhead" style={styles.signInLabel}>
              Sign in
            </Text>
          </Pressable>
        </View>
      )}

      <Link href="/settings" asChild>
        <Pressable accessibilityRole="button" style={styles.row}>
          <Text>Settings</Text>
        </Pressable>
      </Link>
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
    gap: theme.spacing['4'],
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    padding: theme.spacing['4'],
    gap: theme.spacing['3'],
  },
  signIn: {
    height: 52,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
  },
  signInLabel: {
    color: theme.colors.accentInk,
  },
  row: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    padding: theme.spacing['4'],
  },
}));

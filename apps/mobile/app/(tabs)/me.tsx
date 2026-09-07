import { Link } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from '@/ui/Text';

// S07 Me, Phase 0 signed-out skeleton: sign-in and settings only
// (docs/screens.md). Sign in with Apple and Google arrive in session 0.6.
export default function MeScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text variant="title">Me</Text>
      <View style={styles.card}>
        <Text>Sign in to RSVP, follow, and post.</Text>
        <Pressable accessibilityRole="button" disabled style={styles.signIn}>
          <Text variant="subhead" style={styles.signInLabel}>
            Sign in
          </Text>
        </Pressable>
        <Text variant="caption" color="secondary">
          Sign in arrives with the next build.
        </Text>
      </View>
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

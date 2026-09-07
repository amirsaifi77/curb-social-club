import { useNetworkState } from 'expo-network';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { auth } from '@/lib/auth';
import { Text } from '@/ui/Text';

type Phase = 'idle' | 'deleting' | 'done' | 'error';

// S35 Delete account (R-26): explains the 30-day window, requires a system
// alert, calls DELETE /me, signs out locally, and shows the done copy with
// the purge date. Offline disables the button.
export default function DeleteAccountScreen() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [purgeAfter, setPurgeAfter] = useState<Date | null>(null);
  const network = useNetworkState();
  const offline = network.isInternetReachable === false;

  function confirm() {
    Alert.alert('Delete your account?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => void run() },
    ]);
  }

  async function run() {
    setPhase('deleting');
    try {
      const date = await auth.deleteAccount();
      setPurgeAfter(new Date(date));
      setPhase('done');
    } catch {
      setPhase('error');
    }
  }

  const disabled = offline || phase === 'deleting' || phase === 'done';
  const keepBy = purgeAfter?.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text variant="title">Delete your account</Text>
      <Text>
        Your profile, garage, RSVPs, and follows are removed now. Your photos and comments are
        hidden now and deleted in 30 days. Meets you host stay listed as unclaimed so people can
        still find them. Sign in again within 30 days to undo this.
      </Text>

      {phase === 'done' ? (
        <View style={styles.notice}>
          <Text>Your account is scheduled for deletion. Sign in before {keepBy} to keep it.</Text>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled, busy: phase === 'deleting' }}
          disabled={disabled}
          onPress={confirm}
          style={[styles.button, disabled && styles.dimmed]}
        >
          <Text variant="subhead" style={styles.buttonLabel}>
            {phase === 'deleting' ? 'Deleting' : 'Delete my account'}
          </Text>
        </Pressable>
      )}

      {phase === 'error' ? (
        <Text variant="caption" style={styles.error} accessibilityLiveRegion="polite">
          Couldn&apos;t delete your account. Check your connection and try again.
        </Text>
      ) : null}
      {offline && phase !== 'done' ? (
        <Text variant="caption" color="secondary">
          You&apos;re offline. Try again when you&apos;re back online.
        </Text>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    padding: theme.spacing.gutter,
    gap: theme.spacing['4'],
  },
  button: {
    height: 52,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.error,
  },
  buttonLabel: {
    color: theme.colors.accentInk,
  },
  dimmed: {
    opacity: 0.5,
  },
  notice: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    padding: theme.spacing['4'],
  },
  error: {
    color: theme.colors.error,
  },
}));

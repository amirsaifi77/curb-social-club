import * as AppleAuthentication from 'expo-apple-authentication';
import { useNetworkState } from 'expo-network';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { StyleSheet, UnistylesRuntime } from 'react-native-unistyles';

import { auth } from '@/lib/auth';
import { isSuspendedError, type SignInOutcome } from '@/lib/auth-store';
import { Text } from '@/ui/Text';

type Message = 'error' | 'suspended' | null;

const COPY = {
  error: "Couldn't sign in. Try again.",
  suspended:
    "This account is suspended. Email hello@curbsocial.club if you think that's a mistake.",
  offline: "You're offline. Sign in when you're back online.",
};

// S26: a form sheet with Apple first and Google second at the same height,
// no email or password (R-22). Dismissing without signing in drops the
// pending action (R-21).
export default function SignInScreen() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const completed = useRef(false);
  const network = useNetworkState();
  const offline = network.isInternetReachable === false;

  useEffect(
    () => () => {
      if (!completed.current) auth.cancelSignIn();
    },
    [],
  );

  async function run(flow: () => Promise<SignInOutcome>) {
    setBusy(true);
    setMessage(null);
    try {
      const outcome = await flow();
      if (outcome.cancelled) return;
      completed.current = true;
      router.back();
    } catch (error) {
      setMessage(isSuspendedError(error) ? 'suspended' : 'error');
    } finally {
      setBusy(false);
    }
  }

  const disabled = busy || offline;

  return (
    <View style={styles.sheet}>
      <View style={styles.header}>
        <Text variant="title">Sign in to curb</Text>
        <Pressable accessibilityRole="button" onPress={() => router.back()} hitSlop={12}>
          <Text variant="subhead" style={styles.cancel}>
            Cancel
          </Text>
        </Pressable>
      </View>
      <Text color="secondary">
        Sign in to mark yourself going, post photos, and follow hosts. Browsing is always free.
      </Text>

      <View pointerEvents={disabled ? 'none' : 'auto'} style={disabled ? styles.dimmed : undefined}>
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={
            UnistylesRuntime.themeName === 'dark'
              ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
              : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
          }
          cornerRadius={8}
          style={styles.button}
          onPress={() => run(auth.signInWithApple)}
        />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled, busy }}
        disabled={disabled}
        onPress={() => run(auth.signInWithGoogle)}
        style={[styles.button, styles.googleButton, disabled && styles.dimmed]}
      >
        <Text variant="subhead">{busy ? 'Signing in' : 'Continue with Google'}</Text>
      </Pressable>

      {offline ? (
        <Text variant="caption" color="secondary">
          {COPY.offline}
        </Text>
      ) : null}
      {message ? (
        <Text variant="caption" style={styles.error} accessibilityLiveRegion="polite">
          {COPY[message]}
        </Text>
      ) : null}

      <Text variant="caption" color="secondary">
        By signing in you agree to the terms and privacy policy.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  sheet: {
    backgroundColor: theme.colors.bg,
    padding: theme.spacing.gutter,
    paddingBottom: rt.insets.bottom + theme.spacing['6'],
    gap: theme.spacing['4'],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cancel: {
    color: theme.colors.link,
  },
  button: {
    height: 52,
    width: '100%',
  },
  googleButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  dimmed: {
    opacity: 0.5,
  },
  error: {
    color: theme.colors.error,
  },
}));

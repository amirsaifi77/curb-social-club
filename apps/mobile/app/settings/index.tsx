import type { ThemeName } from '@curb/design-tokens';
import * as Application from 'expo-application';
import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { auth, useAuth } from '@/lib/auth';
import type { AppearanceSetting } from '@/lib/theme';
import { setThemeSetting, useThemeSetting } from '@/lib/theme-store';
import { Text } from '@/ui/Text';

// S27 Settings, Phase 0: Theme (S38), Account, and About. Signed out shows
// Theme, Sign in, and About only (R-27). Copy from the spec's Copy tables.
const THEME_ROWS: Array<{ name: ThemeName; label: string; caption: string }> = [
  {
    name: 'marine-layer',
    label: 'Marine Layer',
    caption: 'Fog white, wet asphalt, Lido Blue. The default.',
  },
  { name: 'harbor', label: 'Harbor', caption: 'Navy, bone, sand, old brass.' },
  { name: 'olive-ivory', label: 'Olive and Ivory', caption: 'Sage, ivory, stone, burnt sienna.' },
];

const APPEARANCE_OPTIONS: Array<{ value: AppearanceSetting; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

// Placeholder URLs until W16 ships in Phase 2 (gaps item 3).
const ABOUT_LINKS = [
  { label: 'Terms', url: 'https://curbsocial.club/terms' },
  { label: 'Privacy', url: 'https://curbsocial.club/privacy' },
  { label: 'Community guidelines', url: 'https://curbsocial.club/guidelines' },
  { label: 'Contact hello@curbsocial.club', url: 'mailto:hello@curbsocial.club' },
];

const PROVIDER_LABELS = { apple: 'Signed in with Apple', google: 'Signed in with Google' } as const;

export default function SettingsScreen() {
  const setting = useThemeSetting();
  const { status, user } = useAuth();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function signOut() {
    await auth.signOut();
    setToast('Signed out on this phone.');
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text variant="label" color="secondary">
        Theme
      </Text>
      <View style={styles.group}>
        {THEME_ROWS.map((row) => {
          const selected = setting.theme === row.name;
          return (
            <Pressable
              key={row.name}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={selected ? `${row.label}, selected` : row.label}
              onPress={() => setThemeSetting({ theme: row.name })}
              style={styles.row}
            >
              <View style={styles.rowText}>
                <Text>{row.label}</Text>
                <Text variant="caption" color="secondary">
                  {row.caption}
                </Text>
              </View>
              {selected ? <View style={styles.selectedDot} /> : null}
            </Pressable>
          );
        })}
      </View>

      <Text variant="label" color="secondary">
        Appearance
      </Text>
      <View style={styles.group}>
        {APPEARANCE_OPTIONS.map((option) => {
          const selected = setting.appearance === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              accessibilityLabel={selected ? `${option.label}, selected` : option.label}
              onPress={() => setThemeSetting({ appearance: option.value })}
              style={styles.row}
            >
              <View style={styles.rowText}>
                <Text>{option.label}</Text>
                {option.value === 'system' ? (
                  <Text variant="caption" color="secondary">
                    Follows your phone&apos;s setting.
                  </Text>
                ) : null}
              </View>
              {selected ? <View style={styles.selectedDot} /> : null}
            </Pressable>
          );
        })}
      </View>

      <Text variant="label" color="secondary">
        Account
      </Text>
      <View style={styles.group}>
        {status === 'signedIn' ? (
          <>
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text>{user?.email ?? 'Email hidden by Apple'}</Text>
                {user ? (
                  <Text variant="caption" color="secondary">
                    {user.identities.map((i) => PROVIDER_LABELS[i.provider]).join(', ')}
                  </Text>
                ) : null}
              </View>
            </View>
            <Pressable accessibilityRole="button" onPress={() => void signOut()} style={styles.row}>
              <Text>Sign out</Text>
            </Pressable>
            <Link href="/settings/delete-account" asChild>
              <Pressable accessibilityRole="button" style={styles.row}>
                <Text style={styles.destructive}>Delete account</Text>
              </Pressable>
            </Link>
          </>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/sign-in')}
            style={styles.row}
          >
            <Text>Sign in</Text>
          </Pressable>
        )}
      </View>
      {toast ? (
        <Text variant="caption" color="secondary" accessibilityLiveRegion="polite">
          {toast}
        </Text>
      ) : null}

      <Text variant="label" color="secondary">
        About
      </Text>
      <View style={styles.group}>
        <View style={styles.row}>
          <Text color="secondary">
            Version {Application.nativeApplicationVersion ?? '0.0.0'} (
            {Application.nativeBuildVersion ?? '0'})
          </Text>
        </View>
        {ABOUT_LINKS.map((link) => (
          <Pressable
            key={link.label}
            accessibilityRole="link"
            onPress={() => void Linking.openURL(link.url)}
            style={styles.row}
          >
            <Text style={styles.link}>{link.label}</Text>
          </Pressable>
        ))}
      </View>
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
    paddingBottom: theme.spacing.tabBarInset,
    gap: theme.spacing['3'],
  },
  group: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.card,
    marginBottom: theme.spacing['3'],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing['4'],
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: theme.spacing['3'],
  },
  rowText: {
    flex: 1,
    gap: theme.spacing['1'],
  },
  selectedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.accent,
  },
  link: {
    color: theme.colors.link,
  },
  destructive: {
    color: theme.colors.error,
  },
}));

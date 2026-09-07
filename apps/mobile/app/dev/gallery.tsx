import { getTheme, themes, typography, type Scheme, type ThemeName } from '@curb/design-tokens';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, Switch, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { SENTRY_DSN, sendSentryTestEvent } from '@/lib/sentry';
import { PrimaryButton, type PrimaryButtonStatus } from '@/ui/PrimaryButton';
import { Surface, type SurfaceMaterial } from '@/ui/Surface';
import { Text, type TextVariant } from '@/ui/Text';

const VARIANTS = Object.keys(typography.scale) as TextVariant[];
const MATERIALS: SurfaceMaterial[] = ['glass', 'blur', 'solid'];
const STATUSES: PrimaryButtonStatus[] = [
  'idle',
  'loading',
  'longRunning',
  'confirmed',
  'going',
  'error',
  'queued',
  'disabled',
];
const THEME_NAMES = Object.keys(themes) as ThemeName[];
const SCHEMES: Scheme[] = ['light', 'dark'];
const IMPORT_STAGES = [
  'Reading link',
  'Finding the date',
  'Finding the place',
  'Drafting your event',
];

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

// S40 dev-only component gallery for the device QA (R-19). PrimaryButton
// statuses join in session 0.10. Not routable in release builds.
export default function GalleryScreen() {
  const [sentryEventId, setSentryEventId] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [failNext, setFailNext] = useState(false);

  if (!__DEV__) {
    return <Redirect href="/+not-found" />;
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text variant="label" color="secondary">
        Text
      </Text>
      {VARIANTS.map((variant) => (
        <Text key={variant} variant={variant}>
          {variant} 7:30 AM
        </Text>
      ))}

      <Text variant="label" color="secondary" style={styles.section}>
        Surface
      </Text>
      {MATERIALS.map((material) => (
        <Surface key={material} material={material} style={styles.surface}>
          <View style={styles.surfaceInner}>
            <Text variant="caption">{material}</Text>
          </View>
        </Surface>
      ))}

      <Text variant="label" color="secondary" style={styles.section}>
        Primary CTA (docs/components/primary-cta.md)
      </Text>
      <View style={styles.toggleRow}>
        <Text variant="caption" color="secondary">
          Reduce Motion
        </Text>
        <Switch value={reduceMotion} onValueChange={setReduceMotion} />
        <Text variant="caption" color="secondary">
          Fail next
        </Text>
        <Switch value={failNext} onValueChange={setFailNext} />
      </View>
      <Text variant="caption" color="secondary">
        Uncontrolled: 700 ms request, idle to loading to confirmed to going.
      </Text>
      <PrimaryButton
        label="I'm going"
        reduceMotion={reduceMotion}
        onPress={async () => {
          await wait(700);
          if (failNext) throw new Error('gallery');
        }}
      />
      <Text variant="caption" color="secondary">
        Fast: 80 ms request, confirmed with no loading.
      </Text>
      <PrimaryButton
        label="Follow"
        goingLabel="Following"
        reduceMotion={reduceMotion}
        onPress={() => wait(80)}
      />
      <Text variant="caption" color="secondary">
        Long running: four stages over 6 s with the progress bar; 1 s shows no bar.
      </Text>
      <PrimaryButton
        label="Import"
        stages={IMPORT_STAGES}
        reduceMotion={reduceMotion}
        onPress={() => wait(6_000)}
      />
      <PrimaryButton
        label="Import (1 s)"
        stages={IMPORT_STAGES}
        reduceMotion={reduceMotion}
        onPress={() => wait(1_000)}
      />

      {THEME_NAMES.map((name) =>
        SCHEMES.map((scheme) => (
          <View
            key={`${name}-${scheme}`}
            style={[styles.swatch, { backgroundColor: getTheme(name, scheme).bg }]}
          >
            <Text variant="label" style={{ color: getTheme(name, scheme).textSecondary }}>
              {`${themes[name].name} ${scheme}`}
            </Text>
            {STATUSES.map((status) => (
              <PrimaryButton
                key={status}
                label="I'm going"
                status={status}
                stages={status === 'longRunning' ? IMPORT_STAGES : undefined}
                disabledReason="Ended"
                colors={getTheme(name, scheme)}
                reduceMotion={reduceMotion}
              />
            ))}
          </View>
        )),
      )}

      <Text variant="label" color="secondary" style={styles.section}>
        Sentry
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => setSentryEventId(sendSentryTestEvent())}
        style={styles.button}
      >
        <Text variant="subhead" style={styles.buttonLabel}>
          Send Sentry test event
        </Text>
      </Pressable>
      <Text variant="caption" color="secondary">
        {SENTRY_DSN
          ? sentryEventId
            ? `Sent event ${sentryEventId}.`
            : 'DSN set. Tap to send one message.'
          : 'EXPO_PUBLIC_SENTRY_DSN is not set; the tap is a no-op.'}
      </Text>
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
    gap: theme.spacing['2'],
  },
  section: {
    marginTop: theme.spacing['4'],
  },
  surface: {
    borderRadius: theme.radius.card,
  },
  surfaceInner: {
    padding: theme.spacing['4'],
  },
  button: {
    height: 52,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.accent,
  },
  buttonLabel: {
    color: theme.colors.accentInk,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing['3'],
  },
  swatch: {
    padding: theme.spacing['4'],
    borderRadius: theme.radius.card,
    gap: theme.spacing['3'],
  },
}));

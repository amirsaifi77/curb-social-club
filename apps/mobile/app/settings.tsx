import type { ThemeName } from '@curb/design-tokens';
import { Pressable, ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import type { AppearanceSetting } from '@/lib/theme';
import { setThemeSetting, useThemeSetting } from '@/lib/theme-store';
import { Text } from '@/ui/Text';

// S27 Settings, Phase 0 skeleton: Theme section (S38) plus placeholders for
// Account (0.6) and About. Copy from the spec's Copy table.
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

export default function SettingsScreen() {
  const setting = useThemeSetting();

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
        <View style={styles.row}>
          <Text color="secondary">Sign in arrives with the next build.</Text>
        </View>
      </View>

      <Text variant="label" color="secondary">
        About
      </Text>
      <View style={styles.group}>
        <View style={styles.row}>
          <Text color="secondary">Legal and licenses arrive before launch.</Text>
        </View>
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
}));

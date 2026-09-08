import { Pressable, View, type PressableProps } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from './Text';

// A plain bordered control for secondary actions. Flat rendering: a solid
// fill and a thin rule, no gradient, no glass (brand guide).
export interface TextButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  emphasis?: 'accent' | 'plain';
}

export function TextButton({ label, emphasis = 'plain', style, ...rest }: TextButtonProps) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} style={style} {...rest}>
      <View style={[styles.button, emphasis === 'accent' && styles.accent]}>
        <Text variant="label" style={emphasis === 'accent' ? styles.accentLabel : undefined}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create((theme) => ({
  button: {
    alignItems: 'center',
    paddingVertical: theme.spacing['3'],
    paddingHorizontal: theme.spacing['5'],
    borderRadius: theme.radius.button,
    borderWidth: theme.radius.hairline,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  accent: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.accent,
  },
  accentLabel: {
    color: theme.colors.accentInk,
  },
}));

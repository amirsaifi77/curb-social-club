import { Modal, Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from '@/ui/Text';

export interface ChipMenuOption<T> {
  value: T;
  label: string;
}

// The Distance and Theme chips carry a set of options (discovery Copy, S03
// rows), so they open one. A menu is content, not chrome: opaque
// `surfaceRaised`, hairline rules, no glass inside (mobile-liquid-glass
// section 4, glass on glass).
export function ChipMenu<T extends string | number>({
  title,
  options,
  selected,
  visible,
  onSelect,
  onClose,
}: {
  title: string;
  options: readonly ChipMenuOption<T>[];
  selected: T;
  visible: boolean;
  onSelect: (value: T) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.scrim} accessibilityLabel="Close" onPress={onClose} />
      <View style={styles.sheet}>
        <Text variant="headline">{title}</Text>
        {options.map((option) => (
          <Pressable
            key={String(option.value)}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: option.value === selected }}
            onPress={() => {
              onSelect(option.value);
              onClose();
            }}
            style={styles.option}
          >
            <Text variant="body" style={option.value === selected ? styles.selected : undefined}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: theme.colors.scrim,
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.surfaceRaised,
    borderTopLeftRadius: theme.radius.card,
    borderTopRightRadius: theme.radius.card,
    paddingHorizontal: theme.spacing.gutter,
    paddingTop: theme.spacing['4'],
    paddingBottom: rt.insets.bottom + theme.spacing['4'],
    gap: theme.spacing['1'],
  },
  option: {
    paddingVertical: theme.spacing['3'],
    borderTopWidth: theme.radius.hairline,
    borderTopColor: theme.colors.border,
  },
  selected: {
    color: theme.colors.accent,
  },
}));

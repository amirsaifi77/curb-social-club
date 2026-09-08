import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from '@/ui/Text';
import { TextButton } from '@/ui/TextButton';

// discovery R-12 and AC-12: the widen state shows only when the response
// holds no sections at all, and the copy changes once already widened.
export const EMPTY_HEADLINE = 'Nothing listed within 20 miles yet.';
export const EMPTY_WIDENED = 'Nothing listed within 50 miles yet. Add the one you know about.';
export const WIDEN_ACTION = 'Widen to 50 miles';
export const ADD_ACTION = 'Add a meet';

export function FeedEmpty({
  widened,
  onWiden,
  onAdd,
}: {
  widened: boolean;
  onWiden: () => void;
  onAdd: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <Text variant="body">{widened ? EMPTY_WIDENED : EMPTY_HEADLINE}</Text>
      {widened ? null : <TextButton label={WIDEN_ACTION} emphasis="accent" onPress={onWiden} />}
      <TextButton label={ADD_ACTION} onPress={onAdd} />
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  wrap: {
    gap: theme.spacing['4'],
    paddingVertical: theme.spacing['8'],
  },
}));

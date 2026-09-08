import type { MapFeature } from '@curb/ui';
import { View } from 'react-native';
import { Marker } from 'react-native-maps';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { PIN_ROLE, pinStyle } from './pin-style';

import { Text } from '@/ui/Text';

// R-16: a selected pin is 1.2x with a `textPrimary` ring. Flat pins: solid
// fill, hairline ring, no shadow (brand-guide.md section 4).
export const SELECTED_SCALE = 1.2;

export function PinMarker({
  feature,
  selected,
  now,
  onPress,
}: {
  feature: Extract<MapFeature, { type: 'pin' }>;
  selected: boolean;
  now: Date;
  onPress: (feature: Extract<MapFeature, { type: 'pin' }>) => void;
}) {
  const { theme } = useUnistyles();
  const style = pinStyle(feature.pin, now);
  // A meet that has finished is not drawn at all: `past` pins are out at
  // launch (gaps item 30).
  if (style === null) return null;

  return (
    <Marker
      identifier={feature.id}
      coordinate={{ latitude: feature.lat, longitude: feature.lng }}
      onPress={() => onPress(feature)}
      tracksViewChanges={false}
      accessibilityLabel={feature.pin.title}
    >
      <View
        style={[
          styles.pin,
          { backgroundColor: theme.colors[PIN_ROLE[style]] },
          selected && { transform: [{ scale: SELECTED_SCALE }], borderColor: theme.colors.textPrimary },
        ]}
      />
    </Marker>
  );
}

export function ClusterMarker({
  feature,
  onPress,
}: {
  feature: Extract<MapFeature, { type: 'cluster' }>;
  onPress: (feature: Extract<MapFeature, { type: 'cluster' }>) => void;
}) {
  const { theme } = useUnistyles();

  return (
    <Marker
      identifier={`cluster-${feature.id}`}
      coordinate={{ latitude: feature.lat, longitude: feature.lng }}
      onPress={() => onPress(feature)}
      tracksViewChanges={false}
      accessibilityLabel={`${feature.count} meets`}
    >
      <View style={[styles.cluster, { backgroundColor: theme.colors.pinCluster }]}>
        <Text variant="caption" style={{ color: theme.colors.pinLabel }}>
          {String(feature.count)}
        </Text>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create((theme) => ({
  pin: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: theme.radius.hairline,
    borderColor: theme.colors.pinLabel,
  },
  cluster: {
    minWidth: 28,
    height: 28,
    paddingHorizontal: theme.spacing['1'],
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));

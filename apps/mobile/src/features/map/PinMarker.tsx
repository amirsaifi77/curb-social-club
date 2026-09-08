import type { MapFeature } from '@curb/ui';
import { SymbolView } from 'expo-symbols';
import { View } from 'react-native';
import { Marker } from 'react-native-maps';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';


import { PIN_GLYPH, PIN_ROLE, pinStyle } from './pin-style';

import { Text } from '@/ui/Text';

// R-16: a selected pin is 1.2x with a `textPrimary` ring. Flat pins: solid
// fill, hairline ring, no shadow (brand-guide.md section 4).
export const SELECTED_SCALE = 1.2;
export const PIN_RING = 2;
export const PIN_GLYPH_SIZE = 11;

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
      {/* brand-guide.md section 4: a filled circle, a 2 px ring in
          surfaceRaised, and a small glyph in pinLabel. No teardrops. */}
      <View
        style={[
          styles.pin,
          { backgroundColor: theme.colors[PIN_ROLE[style]] },
          selected && {
            transform: [{ scale: SELECTED_SCALE }],
            borderColor: theme.colors.textPrimary,
          },
        ]}
      >
        <SymbolView
          name={PIN_GLYPH[style]}
          size={PIN_GLYPH_SIZE}
          tintColor={theme.colors.pinLabel}
          resizeMode="scaleAspectFit"
          fallback={null}
        />
      </View>
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
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    // The ring is the surface tone, so a pin reads against the map rather
    // than growing a halo in the glyph colour.
    borderWidth: PIN_RING,
    borderColor: theme.colors.surfaceRaised,
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

import { Pressable, ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { MAP_COPY } from './copy';
import { DISTANCE_OPTIONS, THEME_OPTIONS, type MapFilters } from './filters';

import { Surface, SurfaceGroup } from '@/ui/Surface';
import { Text } from '@/ui/Text';

// R-17: four chips in one container and locate-me in another, both glass on
// iOS 26 and the same layout in blur or solid elsewhere. Chips are chrome
// over the map, so they are the one place glass belongs on S03; the sheet
// and its rows stay opaque.
export function FilterChips({
  filters,
  onChange,
  onLocateMe,
  onOpenTheme,
  onOpenDistance,
}: {
  filters: MapFilters;
  onChange: (next: MapFilters) => void;
  onLocateMe: () => void;
  onOpenTheme: () => void;
  onOpenDistance: () => void;
}) {
  const theme = THEME_OPTIONS.find((option) => option.value === filters.theme);
  const distance = DISTANCE_OPTIONS.find((option) => option.miles === filters.distanceMiles);

  return (
    <View style={styles.layer} pointerEvents="box-none">
      {/* The four chips scroll rather than wrap: wrapping onto a second row
          on a narrow phone would push them into the pill below. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rowContent}
      >
        <SurfaceGroup style={styles.row}>
        <Chip
          label={MAP_COPY.chipWeekend}
          selected={filters.thisWeekend}
          onPress={() => onChange({ ...filters, thisWeekend: !filters.thisWeekend })}
        />
        <Chip
          label={filters.distanceMiles === 20 ? MAP_COPY.chipDistance : (distance?.label ?? MAP_COPY.chipDistance)}
          selected={filters.distanceMiles !== 20}
          onPress={onOpenDistance}
        />
        <Chip
          label={filters.theme === 'all' ? MAP_COPY.chipTheme : (theme?.label ?? MAP_COPY.chipTheme)}
          selected={filters.theme !== 'all'}
          onPress={onOpenTheme}
        />
        <Chip
          label={MAP_COPY.chipRecurring}
          selected={filters.recurringOnly}
          onPress={() => onChange({ ...filters, recurringOnly: !filters.recurringOnly })}
        />
        </SurfaceGroup>
      </ScrollView>

      <SurfaceGroup style={styles.locate}>
        <Surface material="glass" interactive style={styles.round}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={MAP_COPY.locateMe}
            onPress={onLocateMe}
            style={styles.roundPress}
          >
            <Text variant="subhead">◎</Text>
          </Pressable>
        </Surface>
      </SurfaceGroup>
    </View>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Surface material="glass" interactive style={styles.chip}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ selected }}
        onPress={onPress}
        style={styles.chipPress}
      >
        {/* Selection reads as the accent, the one accent on this screen. */}
        <Text variant="subhead" style={selected ? styles.chipSelected : undefined}>
          {label}
        </Text>
      </Pressable>
    </Surface>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  layer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: rt.insets.top + theme.spacing['2'],
    gap: theme.spacing['3'],
  },
  rowContent: {
    paddingHorizontal: theme.spacing.gutter,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing['2'],
  },
  locate: {
    alignSelf: 'flex-end',
    paddingHorizontal: theme.spacing.gutter,
  },
  chip: {
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
  },
  chipPress: {
    paddingHorizontal: theme.spacing['3'],
    paddingVertical: theme.spacing['2'],
  },
  chipSelected: {
    color: theme.colors.accent,
  },
  round: {
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
  },
  roundPress: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));

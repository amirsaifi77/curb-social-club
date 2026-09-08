import type { EventSummary } from '@curb/api-client';
import BottomSheet, { BottomSheetFlatList, type BottomSheetFlatListMethods } from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';

import { MAP_COPY, peekLabel } from './copy';
import { availableSorts, type Sort } from './filters';

import { EventCard } from '@/components/EventCard';
import { Text } from '@/ui/Text';
import { TextButton } from '@/ui/TextButton';

// R-18: peek with a count, half list, full list. The full detent is S04.
export const DETENTS = ['14%', '45%', '90%'] as const;
export const FULL_DETENT = 2;

export interface MeetSheetHandle {
  /** R-16: bring a pin's card into view when its pin is tapped. */
  scrollToEvent: (eventId: string) => void;
}

export interface MeetSheetProps {
  events: EventSummary[];
  count: number;
  sort: Sort;
  near: string | null;
  onSort: (sort: Sort) => void;
  onSelect: (event: EventSummary) => void;
  selectedEventId: string | null;
  status: 'loading' | 'error' | 'offline' | 'ready';
  truncated: boolean;
  /** A one-line message from a control, such as locate-me being refused. */
  notice?: string | null;
  onRetry: () => void;
  onShowAllUpcoming: () => void;
}

// The sheet is a sheet: `surfaceRaised`, opaque rows, no glass inside
// (docs/mobile-liquid-glass.md section 4, glass on glass).
export const MeetSheet = forwardRef<MeetSheetHandle, MeetSheetProps>(function MeetSheet(
  {
    events,
    count,
    sort,
    near,
    onSort,
    onSelect,
    selectedEventId,
    status,
    truncated,
    notice,
    onRetry,
    onShowAllUpcoming,
  },
  ref,
) {
  const { theme } = useUnistyles();
  const list = useRef<BottomSheetFlatListMethods>(null);
  const [detent, setDetent] = useState(0);
  const sorts = availableSorts(near);
  // The same sheet is two screens. Below the full detent it is S03's list of
  // what is on the map, so a card recenters and selects (R-16); at the full
  // detent it is S04, where a card opens the meet (docs/screens.md S04).
  const opensMeets = detent >= FULL_DETENT;

  useImperativeHandle(ref, () => ({
    scrollToEvent(eventId) {
      const index = events.findIndex((event) => event.id === eventId);
      if (index >= 0) list.current?.scrollToIndex({ index, animated: true, viewPosition: 0.2 });
    },
  }));

  const header = useMemo(
    () => (
      <View style={styles.header}>
        <Text variant="subhead">{peekLabel(count)}</Text>

        {sorts.length > 1 ? (
          <View style={styles.sorts}>
            {sorts.map((option) => (
              <TextButton
                key={option}
                label={option === 'date' ? MAP_COPY.sortSoonest : MAP_COPY.sortNearest}
                emphasis={option === sort ? 'accent' : 'plain'}
                onPress={() => onSort(option)}
              />
            ))}
          </View>
        ) : null}

        {/* R-19: what arrived is drawn; the notice says the rest is there. */}
        {truncated ? (
          <Text variant="caption" color="secondary" accessibilityRole="alert">
            {MAP_COPY.truncated}
          </Text>
        ) : null}

        {notice ? (
          <Text variant="caption" color="secondary" accessibilityRole="alert">
            {notice}
          </Text>
        ) : null}

        {status === 'offline' ? (
          <Text variant="caption" color="secondary" accessibilityRole="alert">
            {MAP_COPY.offline}
          </Text>
        ) : null}

        {status === 'error' ? (
          <View style={styles.state}>
            <Text variant="body">{MAP_COPY.error}</Text>
            <TextButton label={MAP_COPY.errorAction} emphasis="accent" onPress={onRetry} />
          </View>
        ) : null}

        {status === 'ready' && events.length === 0 ? (
          <View style={styles.state}>
            <Text variant="body">{MAP_COPY.empty}</Text>
            <TextButton label={MAP_COPY.emptyToggle} onPress={onShowAllUpcoming} />
          </View>
        ) : null}
      </View>
    ),
    [count, events.length, notice, onRetry, onShowAllUpcoming, onSort, sort, sorts, status, truncated],
  );

  const renderItem = useCallback(
    ({ item }: { item: EventSummary }) => (
      <View style={[styles.row, item.id === selectedEventId && styles.rowSelected]}>
        <EventCard event={item} onPress={opensMeets ? undefined : () => onSelect(item)} />
      </View>
    ),
    [onSelect, opensMeets, selectedEventId],
  );

  return (
    <BottomSheet
      index={0}
      snapPoints={DETENTS as unknown as string[]}
      enableDynamicSizing={false}
      onChange={setDetent}
      backgroundStyle={{ backgroundColor: theme.colors.surfaceRaised }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.border }}
    >
      <BottomSheetFlatList
        ref={list}
        data={events}
        keyExtractor={(event) => event.id}
        ListHeaderComponent={header}
        renderItem={renderItem}
        contentContainerStyle={styles.content}
        onScrollToIndexFailed={() => {}}
      />
    </BottomSheet>
  );
});

const styles = StyleSheet.create((theme, rt) => ({
  header: {
    gap: theme.spacing['3'],
    paddingBottom: theme.spacing['3'],
  },
  sorts: {
    flexDirection: 'row',
    gap: theme.spacing['4'],
  },
  state: {
    gap: theme.spacing['3'],
    paddingVertical: theme.spacing['4'],
  },
  content: {
    paddingHorizontal: theme.spacing.gutter,
    paddingBottom: rt.insets.bottom + theme.spacing.tabBarInset,
    gap: theme.spacing['4'],
  },
  row: {
    borderRadius: theme.radius.card,
  },
  rowSelected: {
    borderWidth: theme.radius.hairline,
    borderColor: theme.colors.textPrimary,
  },
}));

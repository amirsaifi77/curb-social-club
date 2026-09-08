import { useEvents, useEventsMap } from '@curb/api-client';
import { createPinIndex, zoomFromRegion, type MapFeature, type Region } from '@curb/ui';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import MapView, { PROVIDER_DEFAULT } from 'react-native-maps';
import { StyleSheet } from 'react-native-unistyles';

import { ChipMenu } from '@/features/map/ChipMenu';
import { MAP_COPY } from '@/features/map/copy';
import { FilterChips } from '@/features/map/FilterChips';
import {
  DEFAULT_FILTERS,
  DISTANCE_OPTIONS,
  THEME_OPTIONS,
  listQueryFor,
  mapQueryFor,
  type MapFilters,
  type Sort,
} from '@/features/map/filters';
import { MeetSheet, type MeetSheetHandle } from '@/features/map/MeetSheet';
import { ClusterMarker, PinMarker } from '@/features/map/PinMarker';
import { useViewport } from '@/features/map/use-viewport';
import { locateDevice } from '@/features/onboarding/locate';
import { useBrowseLocation } from '@/lib/use-browse-location';
import { Surface } from '@/ui/Surface';
import { Text } from '@/ui/Text';

const SPAN_DEGREES = 0.4;

// S03 Map (discovery R-15 to R-19). Apple Maps fills the screen; the chips
// are the only glass, the sheet and its rows are opaque content.
export default function MapScreen() {
  const { width } = useWindowDimensions();
  const { area, near, setArea } = useBrowseLocation();
  const [locateNotice, setLocateNotice] = useState<string | null>(null);
  const [menu, setMenu] = useState<'theme' | 'distance' | null>(null);
  const initial: Region = useMemo(
    () => ({
      latitude: area.lat,
      longitude: area.lng,
      latitudeDelta: SPAN_DEGREES / 2,
      longitudeDelta: SPAN_DEGREES,
    }),
    // The map opens on the browse area and is the person's to move from
    // there; following the area afterwards would fight the pan.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const viewport = useViewport(initial);
  const [filters, setFilters] = useState<MapFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<Sort>('date');
  const [selected, setSelected] = useState<{ pinId: string; eventId: string } | null>(null);
  const map = useRef<MapView>(null);
  const sheet = useRef<MeetSheetHandle>(null);

  const enabled = viewport.bbox !== null;
  const pins = useEventsMap(mapQueryFor(viewport.bbox ?? '', filters), { enabled });
  const list = useEvents(listQueryFor(viewport.bbox ?? '', filters, sort, near), { enabled });

  const index = useMemo(() => createPinIndex(pins.data?.data ?? []), [pins.data]);
  const features = useMemo(() => {
    if (!viewport.committed) return [];
    return index.featuresIn(
      {
        west: viewport.region.longitude - viewport.region.longitudeDelta / 2,
        south: viewport.region.latitude - viewport.region.latitudeDelta / 2,
        east: viewport.region.longitude + viewport.region.longitudeDelta / 2,
        north: viewport.region.latitude + viewport.region.latitudeDelta / 2,
      },
      zoomFromRegion(viewport.region, width),
    );
  }, [index, viewport.committed, viewport.region, width]);

  // R-16: a pin selects and scrolls its card in; a card recenters the map.
  const onPin = useCallback((feature: Extract<MapFeature, { type: 'pin' }>) => {
    setSelected({ pinId: feature.id, eventId: feature.pin.event_id });
    sheet.current?.scrollToEvent(feature.pin.event_id);
  }, []);

  const onCluster = useCallback(
    (feature: Extract<MapFeature, { type: 'cluster' }>) => {
      const zoom = index.expansionZoom(feature.id);
      const span = 360 / 2 ** zoom;
      map.current?.animateToRegion({
        latitude: feature.lat,
        longitude: feature.lng,
        latitudeDelta: span / 2,
        longitudeDelta: span,
      });
    },
    [index],
  );

  // R-17: locate-me asks for the same reduced accuracy S01 does, rounds
  // through the one boundary, and moves the map rather than tracking it.
  const locateMe = useCallback(async () => {
    const outcome = await locateDevice();
    if (outcome.status !== 'ok') {
      setLocateNotice(MAP_COPY.locateDenied);
      return;
    }
    setLocateNotice(null);
    setArea(outcome.area);
    map.current?.animateToRegion({
      latitude: outcome.area.lat,
      longitude: outcome.area.lng,
      latitudeDelta: viewport.region.latitudeDelta,
      longitudeDelta: viewport.region.longitudeDelta,
    });
  }, [setArea, viewport.region.latitudeDelta, viewport.region.longitudeDelta]);

  const status = pins.isError
    ? (pins.data ? 'offline' : 'error')
    : pins.isLoading || list.isLoading
      ? 'loading'
      : 'ready';

  return (
    <View style={styles.screen}>
      <MapView
        ref={map}
        provider={PROVIDER_DEFAULT}
        style={StyleSheet.absoluteFill}
        initialRegion={initial}
        onRegionChangeComplete={viewport.onRegionChange}
        showsUserLocation={false}
      >
        {features.map((feature) =>
          feature.type === 'cluster' ? (
            <ClusterMarker key={`c-${feature.id}`} feature={feature} onPress={onCluster} />
          ) : (
            <PinMarker
              key={feature.id}
              feature={feature}
              selected={selected?.pinId === feature.id}
              now={new Date()}
              onPress={onPin}
            />
          ),
        )}
      </MapView>

      <FilterChips
        filters={filters}
        onChange={setFilters}
        onLocateMe={() => void locateMe()}
        onOpenTheme={() => setMenu('theme')}
        onOpenDistance={() => setMenu('distance')}
      />

      <ChipMenu
        title={MAP_COPY.chipTheme}
        options={THEME_OPTIONS}
        selected={filters.theme}
        visible={menu === 'theme'}
        onSelect={(theme) => setFilters({ ...filters, theme })}
        onClose={() => setMenu(null)}
      />

      <ChipMenu
        title={MAP_COPY.chipDistance}
        options={DISTANCE_OPTIONS.map((option) => ({ value: option.miles, label: option.label }))}
        selected={filters.distanceMiles}
        visible={menu === 'distance'}
        onSelect={(distanceMiles) => setFilters({ ...filters, distanceMiles })}
        onClose={() => setMenu(null)}
      />

      {/* R-15: the pill, and only the pill, fetches a new box after the
          first load. It is disabled offline, where a refetch cannot help. */}
      {viewport.showPill ? (
        <View style={styles.pillLayer} pointerEvents="box-none">
          <Surface material="glass" interactive style={styles.pill}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={MAP_COPY.searchThisArea}
              accessibilityState={{ disabled: status === 'offline' }}
              disabled={status === 'offline'}
              onPress={viewport.commit}
              style={styles.pillPress}
            >
              <Text variant="subhead">{MAP_COPY.searchThisArea}</Text>
            </Pressable>
          </Surface>
        </View>
      ) : null}

      <MeetSheet
        ref={sheet}
        events={list.data?.data ?? []}
        count={pins.data?.data.length ?? 0}
        sort={sort}
        near={near}
        onSort={setSort}
        onSelect={(event) => {
          setSelected({ pinId: event.id, eventId: event.id });
          const pin = (pins.data?.data ?? []).find((row) => row.event_id === event.id);
          if (pin) {
            setSelected({ pinId: pin.id, eventId: event.id });
            map.current?.animateToRegion({
              latitude: pin.lat,
              longitude: pin.lng,
              latitudeDelta: viewport.region.latitudeDelta,
              longitudeDelta: viewport.region.longitudeDelta,
            });
          }
        }}
        selectedEventId={selected?.eventId ?? null}
        status={viewport.tooWide ? 'ready' : status}
        truncated={pins.data?.meta.truncated ?? viewport.tooWide}
        notice={locateNotice}
        onRetry={() => {
          void pins.refetch();
          void list.refetch();
        }}
        onShowAllUpcoming={() => setFilters({ ...filters, thisWeekend: false })}
      />
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  pillLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: rt.insets.top + theme.spacing['16'],
    alignItems: 'center',
  },
  pill: {
    borderRadius: theme.radius.pill,
    overflow: 'hidden',
  },
  pillPress: {
    paddingHorizontal: theme.spacing['4'],
    paddingVertical: theme.spacing['2'],
  },
}));

import { useEvents, useEventsMap } from '@curb/api-client';
import {
  bboxFromRegion,
  createPinIndex,
  spanForZoom,
  zoomFromRegion,
  type MapFeature,
  type Region,
} from '@curb/ui';
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
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
  withinDistance,
  type MapFilters,
  type Sort,
} from '@/features/map/filters';
import { mapTargetVersion, readMapTarget, subscribeMapTarget } from '@/features/map/map-target';
import { MeetSheet, type MeetSheetHandle, type SheetStatus } from '@/features/map/MeetSheet';
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

  // Both queries are memoized because their shape is their cache key: a
  // fresh object per render whose window moved would be a fresh query, and
  // the map would refetch itself for as long as it was on screen.
  const enabled = viewport.bbox !== null;
  const pinQuery = useMemo(() => mapQueryFor(viewport.bbox ?? '', filters), [viewport.bbox, filters]);
  const listQuery = useMemo(
    () => listQueryFor(viewport.bbox ?? '', filters, sort, near),
    [viewport.bbox, filters, sort, near],
  );
  const pins = useEventsMap(pinQuery, { enabled });
  const list = useEvents(listQuery, { enabled });

  // R-17: the Distance chip cannot travel with the box, so it is applied to
  // the pins here, which also keeps the sheet's count honest.
  const visiblePins = useMemo(
    () => withinDistance(pins.data?.data ?? [], near, filters.distanceMiles),
    [pins.data, near, filters.distanceMiles],
  );
  const index = useMemo(() => createPinIndex(visiblePins), [visiblePins]);
  // One clock per set of pins: a new Date each render would redraw every
  // marker for nothing, and the styles only move as the pins do. Keyed on
  // when the data arrived, which is the moment they can have moved.
  const now = useMemo(() => new Date(pins.dataUpdatedAt || Date.now()), [pins.dataUpdatedAt]);
  const features = useMemo(() => {
    if (!viewport.committed) return [];
    // The same conversion the queries use, so what is drawn and what was
    // asked for cannot drift apart.
    return index.featuresIn(bboxFromRegion(viewport.region), zoomFromRegion(viewport.region, width));
  }, [index, viewport.committed, viewport.region, width]);

  // R-16: a pin selects and scrolls its card in; a card recenters the map.
  const onPin = useCallback((feature: Extract<MapFeature, { type: 'pin' }>) => {
    setSelected({ pinId: feature.id, eventId: feature.pin.event_id });
    sheet.current?.scrollToEvent(feature.pin.event_id);
  }, []);

  const onCluster = useCallback(
    (feature: Extract<MapFeature, { type: 'cluster' }>) => {
      const span = spanForZoom(index.expansionZoom(feature.id), width);
      map.current?.animateToRegion({
        latitude: feature.lat,
        longitude: feature.lng,
        // The map's own aspect ratio, so the fly-to frames what it clustered.
        latitudeDelta: span * (viewport.region.latitudeDelta / viewport.region.longitudeDelta),
        longitudeDelta: span,
      });
    },
    [index, viewport.region.latitudeDelta, viewport.region.longitudeDelta, width],
  );

  // R-17: locate-me asks for the same reduced accuracy S01 does, rounds
  // through the one boundary, and moves the map rather than tracking it.
  const locateMe = useCallback(async () => {
    const outcome = await locateDevice();
    if (outcome.status !== 'ok') {
      // Refused and could not be reached are different facts, the same
      // distinction R-11 draws for the geocoder.
      setLocateNotice(
        outcome.status === 'denied' ? MAP_COPY.locateDenied : MAP_COPY.locateFailed,
      );
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

  // The Screens table's S03 states, in the order they take precedence. A box
  // the API would refuse is its own state: it is not an empty area, and
  // offering "Show all upcoming" there would be an action that cannot help.
  // AC-22: S05 hands the map a place to go to. The map is mounted behind
  // the modal the whole time, so `initialRegion` cannot do this: it only
  // applies at mount. Committing the viewport is the fresh fetch the AC
  // asks for.
  const targetVersion = useSyncExternalStore(subscribeMapTarget, mapTargetVersion, mapTargetVersion);
  useEffect(() => {
    const area = readMapTarget();
    if (targetVersion === 0 || !area) return;
    map.current?.animateToRegion({
      latitude: area.lat,
      longitude: area.lng,
      latitudeDelta: SPAN_DEGREES / 2,
      longitudeDelta: SPAN_DEGREES,
    });
    viewport.onRegionChange({
      latitude: area.lat,
      longitude: area.lng,
      latitudeDelta: SPAN_DEGREES / 2,
      longitudeDelta: SPAN_DEGREES,
    });
    viewport.commit();
    // The viewport helpers are stable; this runs once per place picked.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetVersion]);

  const status: SheetStatus = viewport.tooWide
    ? 'too_wide'
    : pins.isError
      ? pins.data
        ? 'offline'
        : 'error'
      : pins.isPending || pins.isFetching || list.isFetching
        ? 'loading'
        : 'ready';

  return (
    <View style={styles.screen}>
      <MapView
        ref={map}
        provider={PROVIDER_DEFAULT}
        style={[StyleSheet.absoluteFill, status === 'loading' && styles.dimmed]}
        initialRegion={initial}
        onRegionChangeComplete={viewport.onRegionChange}
        showsUserLocation={false}
      >
        {/* R-15 loading: the pins on screen are the last box's, so they dim
            rather than vanish while the next one arrives. */}
        {features.map((feature) =>
          feature.type === 'cluster' ? (
            <ClusterMarker key={`c-${feature.id}`} feature={feature} onPress={onCluster} />
          ) : (
            <PinMarker
              key={feature.id}
              feature={feature}
              selected={selected?.pinId === feature.id}
              now={now}
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
        count={visiblePins.length}
        sort={sort}
        near={near}
        onSort={setSort}
        onSelect={(event) => {
          // R-16: a card recenters the map on its pin and selects it. A row
          // with no pin in the current box selects nothing rather than
          // flying the map somewhere the person cannot see.
          const pin = visiblePins.find((row) => row.event_id === event.id);
          if (!pin) return;
          setSelected({ pinId: pin.id, eventId: event.id });
          map.current?.animateToRegion({
            latitude: pin.lat,
            longitude: pin.lng,
            latitudeDelta: viewport.region.latitudeDelta,
            longitudeDelta: viewport.region.longitudeDelta,
          });
        }}
        selectedEventId={selected?.eventId ?? null}
        status={status}
        truncated={pins.data?.meta.truncated ?? false}
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
  dimmed: {
    opacity: 0.5,
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

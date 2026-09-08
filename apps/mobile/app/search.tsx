import { useSearchClubs, useSearchEvents, useSearchSponsors } from '@curb/api-client';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { requestMapTarget } from '@/features/map/map-target';
import { SEARCH_COPY, noResults } from '@/features/search/copy';
import { searchPlaces, type Place } from '@/features/search/places';
import { readRecents, rememberSearch } from '@/features/search/recents';
import { markSearchClosed } from '@/features/search/SearchHeader';
import { Recents, SearchResults } from '@/features/search/SearchResults';
import { useDebouncedQuery } from '@/hooks/use-debounced-query';
import { WIDE_RADIUS_KM } from '@/lib/browse-location';
import { setBrowseArea, useBrowseLocation } from '@/lib/use-browse-location';
import { Text } from '@/ui/Text';
import { TextButton } from '@/ui/TextButton';

// R-20: the search radius the no-results line names, 50 miles.
const SEARCH_RADIUS_KM = WIDE_RADIUS_KM;

// S05 as a modal over Home or Map (docs/screens.md). The field is the
// screen's own; the native search bar in each tab's header opens this.
export default function SearchScreen() {
  const { near } = useBrowseLocation();
  const { text, query, setText } = useDebouncedQuery();
  const [recents, setRecents] = useState<string[]>(() => readRecents());
  // R-21 widens one query for one search. Held as the query it applies to,
  // not a boolean reset in an effect: the reset landed a render late, so the
  // next search fired twice per group, once wide and once near.
  const [everywhereFor, setEverywhereFor] = useState<string | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [placesUnavailable, setPlacesUnavailable] = useState(false);

  const asking = query !== null;
  const everywhere = query !== null && everywhereFor === query;
  const area = { near, radius_km: SEARCH_RADIUS_KM };
  // R-21 and the block's deliverable: Search everywhere repeats the *events*
  // query without `near`. Clubs and sponsors keep theirs.
  const events = useSearchEvents(
    { q: query ?? '', ...(everywhere ? {} : area) },
    { enabled: asking },
  );
  const clubs = useSearchClubs({ q: query ?? '', ...area }, { enabled: asking });
  const sponsors = useSearchSponsors({ q: query ?? '', ...area }, { enabled: asking });

  // Places never leaves the device (R-20), so it is not a query.
  useEffect(() => {
    if (!query) {
      setPlaces([]);
      setPlacesUnavailable(false);
      return;
    }
    let alive = true;
    void searchPlaces(query).then((outcome) => {
      if (!alive) return;
      setPlaces(outcome.places);
      setPlacesUnavailable(outcome.status === 'unavailable');
    });
    return () => {
      alive = false;
    };
  }, [query]);

  // Remembering on every successful fetch filled the ten slots with the
  // prefixes of one word: pausing mid-"corona" committed "co", "cor",
  // "coro". A recent is something the person acted on, so it is recorded
  // when they submit the field or open a result.
  const remember = useCallback((text: string) => setRecents(rememberSearch(text)), []);

  // Lets the header field open S05 again once this one has gone.
  useEffect(() => markSearchClosed, []);

  const groups = {
    events: events.data?.data ?? [],
    clubs: clubs.data ?? [],
    sponsors: sponsors.data ?? [],
    places,
  };
  const total =
    groups.events.length + groups.clubs.length + groups.sponsors.length + groups.places.length;
  // R-20: a group that is slow does not hold up the others, so the line
  // says a search is still running rather than replacing what has arrived.
  const loading = asking && (events.isLoading || clubs.isLoading || sponsors.isLoading);
  const failed = events.isError && clubs.isError && sponsors.isError;
  // Screens S05 offline: a group that failed while another still has rows
  // is saved results, not a failed search. Failing with nothing is an error.
  const offline =
    !failed && (events.isError || clubs.isError || sponsors.isError || placesUnavailable);

  function pickPlace(place: Place) {
    // R-20 and AC-22: the map moves to the place, and S05 closes. The area
    // is what every other browse query reads; the target is the deliberate
    // "go here" the map consumes, since it does not follow the area (that
    // would fight a pan). S05 opens from Home too, so this lands on the tab
    // that can actually show the place.
    setBrowseArea(place.area);
    requestMapTarget(place.area);
    remember(place.label);
    router.back();
    router.push('/(tabs)/map');
  }

  return (
    <View style={styles.screen}>
      <TextInput
        value={text}
        onChangeText={setText}
        onSubmitEditing={() => query && remember(query)}
        placeholder={SEARCH_COPY.placeholder}
        accessibilityLabel={SEARCH_COPY.placeholder}
        style={styles.field}
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
        // This screen exists because someone tapped a search field. Landing
        // here without the keyboard would be the surprising behaviour, and
        // VoiceOver announces the field it lands on.
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
      />

      <ScrollView contentContainerStyle={styles.content} keyboardDismissMode="on-drag">
        {!asking ? <Recents recents={recents} onPick={setText} /> : null}

        {loading ? (
          <Text variant="body" color="secondary" accessibilityRole="progressbar">
            {SEARCH_COPY.loading}
          </Text>
        ) : null}

        {offline ? (
          <Text variant="caption" color="secondary" accessibilityRole="alert">
            {SEARCH_COPY.offline}
          </Text>
        ) : null}

        {failed ? (
          <View style={styles.state}>
            <Text variant="body">{SEARCH_COPY.error}</Text>
            <TextButton
              label={SEARCH_COPY.errorAction}
              emphasis="accent"
              onPress={() => {
                void events.refetch();
                void clubs.refetch();
                void sponsors.refetch();
              }}
            />
          </View>
        ) : null}

        {asking && !failed ? <SearchResults groups={groups} onPickPlace={pickPlace} /> : null}

        {/* R-21: nothing found offers a wider search and a way to add it. */}
        {asking && !loading && !failed && total === 0 ? (
          <View style={styles.state}>
            <Text variant="body">{noResults(query)}</Text>
            {everywhere ? null : (
              <TextButton
                label={SEARCH_COPY.searchEverywhere}
                emphasis="accent"
                onPress={() => setEverywhereFor(query)}
              />
            )}
            <TextButton
              label={SEARCH_COPY.addAMeet}
              // Dismissing and pushing in the same tick races the modal's
              // own animation; dismissTo does the one navigation.
              onPress={() => router.dismissTo('/(tabs)/new')}
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    paddingTop: rt.insets.top + theme.spacing['4'],
  },
  field: {
    marginHorizontal: theme.spacing.gutter,
    borderWidth: theme.radius.hairline,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.button,
    paddingVertical: theme.spacing['3'],
    paddingHorizontal: theme.spacing['4'],
    color: theme.colors.textPrimary,
    backgroundColor: theme.colors.surface,
  },
  content: {
    padding: theme.spacing.gutter,
    paddingBottom: rt.insets.bottom + theme.spacing['8'],
    gap: theme.spacing['6'],
  },
  state: {
    gap: theme.spacing['3'],
  },
}));

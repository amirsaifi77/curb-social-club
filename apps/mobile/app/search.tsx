import { useSearchClubs, useSearchEvents, useSearchSponsors } from '@curb/api-client';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

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
  const [everywhere, setEverywhere] = useState(false);
  const [places, setPlaces] = useState<Place[]>([]);

  const asking = query !== null;
  // R-21: Search everywhere repeats the events query without `near`.
  const area = everywhere ? {} : { near, radius_km: SEARCH_RADIUS_KM };
  const events = useSearchEvents({ q: query ?? '', ...area }, { enabled: asking });
  const clubs = useSearchClubs({ q: query ?? '', ...area }, { enabled: asking });
  const sponsors = useSearchSponsors({ q: query ?? '', ...area }, { enabled: asking });

  // Places never leaves the device (R-20), so it is not a query.
  useEffect(() => {
    if (!query) {
      setPlaces([]);
      return;
    }
    let alive = true;
    void searchPlaces(query).then((found) => {
      if (alive) setPlaces(found);
    });
    return () => {
      alive = false;
    };
  }, [query]);

  // A search that returned something is a search worth remembering.
  useEffect(() => {
    if (query && events.isSuccess) setRecents(rememberSearch(query));
  }, [query, events.isSuccess]);

  // Widening is about this query; the next one starts near again.
  useEffect(() => setEverywhere(false), [query]);

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
  const loading = asking && (events.isLoading || clubs.isLoading || sponsors.isLoading);
  const failed = events.isError && clubs.isError && sponsors.isError;
  // Screens S05 offline: a group that failed while another still has rows
  // is saved results, not a failed search. Failing with nothing is an error.
  const offline = !failed && (events.isError || clubs.isError || sponsors.isError);

  function pickPlace(place: Place) {
    // R-20 and AC-22: the map moves to the place, and S05 closes.
    setBrowseArea(place.area);
    router.back();
  }

  return (
    <View style={styles.screen}>
      <TextInput
        value={text}
        onChangeText={setText}
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

        {asking && !loading && !failed ? (
          <SearchResults groups={groups} onPickPlace={pickPlace} />
        ) : null}

        {/* R-21: nothing found offers a wider search and a way to add it. */}
        {asking && !loading && !failed && total === 0 ? (
          <View style={styles.state}>
            <Text variant="body">{noResults(query)}</Text>
            {everywhere ? null : (
              <TextButton
                label={SEARCH_COPY.searchEverywhere}
                emphasis="accent"
                onPress={() => setEverywhere(true)}
              />
            )}
            <TextButton
              label={SEARCH_COPY.addAMeet}
              onPress={() => {
                router.back();
                router.push('/(tabs)/new');
              }}
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

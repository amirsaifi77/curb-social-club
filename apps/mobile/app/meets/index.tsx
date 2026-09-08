import { pageItems, useEventsPages } from '@curb/api-client';
import { FlashList } from '@shopify/flash-list';
import { Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { EventCard } from '@/components/EventCard';
import { FILTERED_LIST_COPY, HOST_PAGE_COPY } from '@/features/host-page/copy';
import { HostPageError } from '@/features/host-page/states';
import { Text } from '@/ui/Text';

// S04 filtered to one host or sponsor: where "See all meets" on S12, S14
// and S11 lands (clubs R-15, sponsors R-15). The map's own list answers a
// viewport; this one answers "everything this host runs", so it takes the
// `host` and `sponsor` filters `GET /events` already documents and no
// geography at all.
export default function FilteredMeetsScreen() {
  const { host, sponsor, title } = useLocalSearchParams<{
    host?: string;
    sponsor?: string;
    title?: string;
  }>();

  const query = {
    ...(host ? { host } : {}),
    ...(sponsor ? { sponsor } : {}),
  };
  const meets = useEventsPages(query);
  const rows = pageItems(meets.data?.pages);

  // Every caller passes the host's name; a hand-typed URL gets no title
  // rather than one this screen made up.
  const header = <Stack.Screen options={{ title: title ?? '' }} />;

  if (meets.isError && !meets.data) {
    return (
      <>
        {header}
        <HostPageError
          copy={HOST_PAGE_COPY.error}
          action={HOST_PAGE_COPY.errorAction}
          onRetry={() => void meets.refetch()}
        />
      </>
    );
  }

  return (
    <>
      {header}
      <View style={styles.screen}>
        {meets.isError ? (
          <Text variant="caption" color="secondary" accessibilityRole="alert" style={styles.inset}>
            {HOST_PAGE_COPY.offline}
          </Text>
        ) : null}
        <FlashList
          data={rows}
          keyExtractor={(event) => event.id}
          contentContainerStyle={styles.content}
          renderItem={({ item }) => <EventCard event={item} />}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (meets.hasNextPage && !meets.isFetchingNextPage) void meets.fetchNextPage();
          }}
          ListEmptyComponent={
            meets.data ? (
              <Text variant="body" color="secondary">
                {FILTERED_LIST_COPY.empty}
              </Text>
            ) : null
          }
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create((theme) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    paddingHorizontal: theme.spacing.gutter,
    paddingVertical: theme.spacing['3'],
  },
  inset: {
    paddingHorizontal: theme.spacing.gutter,
    paddingTop: theme.spacing['2'],
  },
}));

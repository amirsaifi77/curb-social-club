import { useFeed } from '@curb/api-client';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { FeedError, OfflineBanner } from '@/features/feed/FeedBanner';
import { FeedEmpty } from '@/features/feed/FeedEmpty';
import { FeedSectionList } from '@/features/feed/FeedSectionList';
import { renderableSections } from '@/features/feed/sections';
import { hasOnboarded } from '@/features/onboarding/state';
import { useBrowseLocation } from '@/lib/use-browse-location';
import { Text } from '@/ui/Text';

// S02 Home (discovery R-12, R-14). The API decides which sections exist and
// in what order; this screen renders them and hides nothing else.
export default function HomeScreen() {
  const { near, radiusKm, widen, widened } = useBrowseLocation();
  const feed = useFeed({ near, radius_km: radiusKm });
  const sections = useMemo(() => renderableSections(feed.data?.sections), [feed.data]);

  // First launch: the area picker opens before Home has anything to ask for.
  useFocusEffect(
    useCallback(() => {
      if (!hasOnboarded()) router.push('/onboarding');
    }, []),
  );

  // R-14: a cached feed rendered while the refetch is failing is saved
  // results, not an error. An error with nothing cached is an error.
  const offline = feed.isError && sections.length > 0;

  if (feed.isError && sections.length === 0) {
    return (
      <View style={styles.state}>
        <FeedError onRetry={() => void feed.refetch()} />
      </View>
    );
  }

  if (!feed.isLoading && sections.length === 0) {
    return (
      <View style={styles.state}>
        <FeedEmpty widened={widened} onWiden={widen} onAdd={() => router.push('/(tabs)/new')} />
      </View>
    );
  }

  if (feed.isLoading) {
    return (
      <View style={styles.state}>
        <Text variant="body" color="secondary">
          Loading meets near you.
        </Text>
      </View>
    );
  }

  return (
    <FeedSectionList
      sections={sections}
      refreshing={feed.isRefetching}
      onRefresh={() => void feed.refetch()}
      header={offline ? <OfflineBanner /> : null}
    />
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  state: {
    flex: 1,
    backgroundColor: theme.colors.bg,
    paddingTop: rt.insets.top + theme.spacing['8'],
    paddingHorizontal: theme.spacing.gutter,
  },
}));

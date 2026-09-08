import { useFeed } from '@curb/api-client';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { ScrollView } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { FeedError, OfflineBanner } from '@/features/feed/FeedBanner';
import { FeedEmpty } from '@/features/feed/FeedEmpty';
import { FeedSectionList } from '@/features/feed/FeedSectionList';
import { FeedSkeleton } from '@/features/feed/FeedSkeleton';
import { renderableSections } from '@/features/feed/sections';
import { hasOnboarded } from '@/features/onboarding/state';
import { useBrowseLocation } from '@/lib/use-browse-location';

// S02 Home (discovery R-12, R-14). The API decides which sections exist and
// in what order; this screen renders them and hides nothing else.
export default function HomeScreen() {
  const { near, radiusKm, chosen, widen, widened } = useBrowseLocation();
  // Nothing is asked for until S01 has committed an area, so the first
  // request is never spent on the default region (R-2).
  const feed = useFeed({ near, radius_km: radiusKm }, { enabled: chosen });
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
  // Waiting on S01 is waiting, not an empty area.
  const loading = !chosen || feed.isLoading;

  if (feed.isError && sections.length === 0) {
    return (
      <StateScroll>
        <FeedError onRetry={() => void feed.refetch()} />
      </StateScroll>
    );
  }

  if (loading) {
    return (
      <StateScroll>
        <FeedSkeleton />
      </StateScroll>
    );
  }

  if (sections.length === 0) {
    return (
      <StateScroll>
        <FeedEmpty widened={widened} onWiden={widen} onAdd={() => router.push('/(tabs)/new')} />
      </StateScroll>
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

// A scroll view so the native large title collapses on these states too.
function StateScroll({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView
      style={styles.state}
      contentContainerStyle={styles.stateContent}
      contentInsetAdjustmentBehavior="automatic"
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  state: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  stateContent: {
    paddingHorizontal: theme.spacing.gutter,
    paddingTop: theme.spacing['4'],
    paddingBottom: rt.insets.bottom + theme.spacing.tabBarInset,
  },
}));

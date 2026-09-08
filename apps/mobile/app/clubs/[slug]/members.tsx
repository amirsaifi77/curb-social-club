import { errorStatus, pageItems, useClubMembersPages } from '@curb/api-client';
import { FlashList } from '@shopify/flash-list';
import { Stack, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { CLUB_COPY, HOST_PAGE_COPY } from '@/features/host-page/copy';
import { MemberRow } from '@/features/host-page/MemberRow';
import { HostPageError, MemberListSkeleton, NotListed } from '@/features/host-page/states';
import { Text } from '@/ui/Text';

// S13 (clubs.md R-16). Active members with the Owner and Admin labels, one
// page at a time behind the standard cursor.
export default function ClubMembersScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const members = useClubMembersPages(slug);

  const header = <Stack.Screen options={{ title: CLUB_COPY.membersHeader }} />;

  if (errorStatus(members.error) === 404) {
    return (
      <>
        {header}
        <NotListed copy={CLUB_COPY.hidden} />
      </>
    );
  }

  if (members.isError && !members.data) {
    return (
      <>
        {header}
        <HostPageError
          copy={HOST_PAGE_COPY.error}
          action={HOST_PAGE_COPY.errorAction}
          onRetry={() => void members.refetch()}
        />
      </>
    );
  }

  // docs/screens.md lists loading among S13's states: rows of the right
  // shape, never a blank list waiting for the first page.
  if (!members.data) {
    return (
      <>
        {header}
        <MemberListSkeleton />
      </>
    );
  }

  const rows = pageItems(members.data.pages);

  return (
    <>
      {header}
      <View style={styles.screen}>
        {members.isError ? (
          <Text variant="caption" color="secondary" accessibilityRole="alert" style={styles.inset}>
            {HOST_PAGE_COPY.offline}
          </Text>
        ) : null}
        <FlashList
          data={rows}
          keyExtractor={(member) => member.id}
          contentContainerStyle={styles.content}
          renderItem={({ item }) => (
            <MemberRow
              handle={item.handle}
              displayName={item.display_name}
              avatarUrl={item.avatar_url}
              role={item.role}
            />
          )}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            // R-16: one page at a time, and never a second request for a
            // page that is already on its way.
            if (members.hasNextPage && !members.isFetchingNextPage) void members.fetchNextPage();
          }}
          ListEmptyComponent={
            <Text variant="body" color="secondary">
              {CLUB_COPY.membersEmpty}
            </Text>
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

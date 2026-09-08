import { errorStatus, useClub, useClubMembers } from '@curb/api-client';
import { Link, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import {
  CLUB_COPY,
  HOST_PAGE_COPY,
  followersLine,
  leadershipOf,
  membersRow,
} from '@/features/host-page/copy';
import { HostHeader } from '@/features/host-page/HostHeader';
import { MEMBERS_PREVIEW, MemberAvatars } from '@/features/host-page/MemberRow';
import { SocialsRow } from '@/features/host-page/SocialsRow';
import { HostPageError, HostPageSkeleton, NotListed } from '@/features/host-page/states';
import { UpcomingMeets } from '@/features/host-page/UpcomingMeets';
import { Text } from '@/ui/Text';

// S12 (clubs.md R-15). Read-only in Phase 1: no Follow control is rendered
// at all, because `viewer.following` is always false and a button that does
// nothing is worse than no button (clubs.md slice 4, Notes).
export default function ClubScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const club = useClub(slug);
  // The row needs roles, which `members_preview` does not carry, so the
  // preview avatars come from the members page instead of from the club.
  const members = useClubMembers(slug);

  const header = <Stack.Screen options={{ title: club.data?.name ?? '' }} />;

  // clubs.md R-5: a hidden club is a 404, and a page rather than an error.
  if (errorStatus(club.error) === 404) {
    return (
      <>
        {header}
        <NotListed copy={CLUB_COPY.hidden} />
      </>
    );
  }

  if (club.isError && !club.data) {
    return (
      <>
        {header}
        <HostPageError
          copy={HOST_PAGE_COPY.error}
          action={HOST_PAGE_COPY.errorAction}
          onRetry={() => void club.refetch()}
        />
      </>
    );
  }

  if (!club.data) {
    return (
      <>
        {header}
        <HostPageSkeleton />
      </>
    );
  }

  const data = club.data;
  const rows = members.data?.data ?? [];
  const leadership = leadershipOf(rows, members.data?.meta.next_cursor == null);

  return (
    <>
      {header}
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {club.isError ? (
          <Text variant="caption" color="secondary" accessibilityRole="alert" style={styles.inset}>
            {HOST_PAGE_COPY.offline}
          </Text>
        ) : null}

        <HostHeader
          name={data.name}
          bannerUrl={data.banner_url}
          avatarUrl={data.avatar_url}
          labels={[data.verified ? CLUB_COPY.verified : null]}
          homeLabel={data.home_label}
          blurb={data.description}
          counts={followersLine(data.followers_count)}
        >
          <SocialsRow links={data.links} />
        </HostHeader>

        <View style={styles.block}>
          <Text variant="headline" accessibilityRole="header">
            {CLUB_COPY.membersHeader}
          </Text>
          {/* The count row is the way into S13, so the block does not print
              the word "Members" twice with a link under a header of the
              same name. */}
          <Link href={`/clubs/${data.slug}/members`} asChild>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={membersRow(data.members_count, leadership)}
            >
              <Text variant="body" color="secondary">
                {membersRow(data.members_count, leadership)}
              </Text>
            </Pressable>
          </Link>
          {/* Outside the row above: each avatar is its own link, and a link
              inside a link is a fight over the touch. */}
          {rows.length > 0 ? <MemberAvatars members={rows.slice(0, MEMBERS_PREVIEW)} /> : null}
        </View>

        <UpcomingMeets
          title={CLUB_COPY.upcomingHeader}
          events={data.upcoming_events}
          emptyCopy={CLUB_COPY.upcomingEmpty}
          seeAll={{
            href: `/meets?host=club:${data.id}&title=${encodeURIComponent(data.name)}`,
            label: CLUB_COPY.seeAll,
          }}
        />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create((theme, rt) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    paddingBottom: rt.insets.bottom + theme.spacing['8'],
    gap: theme.spacing['6'],
  },
  inset: {
    paddingHorizontal: theme.spacing.gutter,
  },
  block: {
    paddingHorizontal: theme.spacing.gutter,
    gap: theme.spacing['3'],
  },
}));

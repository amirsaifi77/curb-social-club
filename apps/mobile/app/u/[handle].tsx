import { errorStatus, useProfile, useProfileClubs, useProfileEvents } from '@curb/api-client';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { HostRowCard } from '@/components/HostRowCard';
import {
  HOST_PAGE_COPY,
  PROFILE_COPY,
  hostCounts,
  roleLabel,
} from '@/features/host-page/copy';
import { HostHeader } from '@/features/host-page/HostHeader';
import { SocialsRow } from '@/features/host-page/SocialsRow';
import { HostPageError, HostPageSkeleton, NotListed } from '@/features/host-page/states';
import { UpcomingMeets } from '@/features/host-page/UpcomingMeets';
import { Text } from '@/ui/Text';

// S11, read-only (profiles-and-follow.md Scope, Phase 1). The user host
// page: avatar, name, handle, home label, host badge, bio, socials, clubs,
// and the meets they host. No Follow, no tabs, no garage, no overflow: all
// Phase 2, and a control that does nothing is worse than none.
export default function ProfileScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const profile = useProfile(handle);
  // The Profile shape carries `clubs`, but only this endpoint sets `role`,
  // which is what the Owner and Admin labels read (R-17).
  const clubs = useProfileClubs(handle, { enabled: Boolean(profile.data) });
  const events = useProfileEvents(handle, {}, { enabled: Boolean(profile.data) });

  const header = <Stack.Screen options={{ title: profile.data?.display_name ?? '' }} />;

  // R-7: a suspended or deleted user is a 404, and so is a handle that was
  // never taken. Both are the same page to the person who tapped the link.
  if (errorStatus(profile.error) === 404) {
    return (
      <>
        {header}
        <NotListed copy={PROFILE_COPY.notFound} />
      </>
    );
  }

  if (profile.isError && !profile.data) {
    return (
      <>
        {header}
        <HostPageError
          copy={HOST_PAGE_COPY.error}
          action={HOST_PAGE_COPY.errorAction}
          onRetry={() => void profile.refetch()}
        />
      </>
    );
  }

  if (!profile.data) {
    return (
      <>
        {header}
        <HostPageSkeleton />
      </>
    );
  }

  const data = profile.data;

  // R-14: a block in either direction reduces the profile to a name and an
  // avatar, and the page says so rather than showing an empty layout.
  if (data.viewer.blocked) {
    return (
      <>
        {header}
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
          <HostHeader name={data.display_name} handle={data.handle} avatarUrl={data.avatar_url} />
          <View style={styles.inset}>
            <Text variant="body" color="secondary">
              {PROFILE_COPY.blocked}
            </Text>
          </View>
        </ScrollView>
      </>
    );
  }

  const clubRows = clubs.data ?? [];
  const hosted = events.data?.data ?? [];

  return (
    <>
      {header}
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {profile.isError ? (
          <Text variant="caption" color="secondary" accessibilityRole="alert" style={styles.inset}>
            {HOST_PAGE_COPY.offline}
          </Text>
        ) : null}

        <HostHeader
          name={data.display_name}
          handle={data.handle}
          avatarUrl={data.avatar_url}
          labels={[data.is_host ? PROFILE_COPY.hostBadge : null]}
          homeLabel={data.home_label}
          blurb={data.bio}
          // R-17: the followers count appears only on a host's profile, and
          // the following count never appears on someone else's at all.
          counts={
            data.is_host
              ? hostCounts(data.counts.followers ?? 0, data.counts.events_hosted ?? 0)
              : null
          }
        >
          <SocialsRow links={data.links} />
        </HostHeader>

        <View style={styles.block}>
          <Text variant="headline" accessibilityRole="header">
            {PROFILE_COPY.clubsHeader}
          </Text>
          {clubRows.length === 0 ? (
            <Text variant="body" color="secondary">
              {PROFILE_COPY.clubsEmpty}
            </Text>
          ) : (
            clubRows.map((club) => (
              <HostRowCard
                key={club.id}
                name={club.name}
                slug={club.slug}
                imageUrl={club.avatar_url}
                label={roleLabel(club.role, data.handle)}
                kind="club"
                layout="list"
              />
            ))
          )}
        </View>

        {/* profiles-and-follow.md gives S11 no line for a host with no
            upcoming meets, so the block is absent rather than carrying a
            sentence this spec never wrote. */}
        {hosted.length > 0 ? (
          <UpcomingMeets
            title={PROFILE_COPY.upcomingHeader}
            events={hosted}
            emptyCopy=""
            seeAllHref={`/meets?host=user:${data.id}&title=${encodeURIComponent(data.display_name)}`}
          />
        ) : null}
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

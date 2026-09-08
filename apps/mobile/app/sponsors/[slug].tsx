import { errorStatus, useSponsor } from '@curb/api-client';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import {
  HOST_PAGE_COPY,
  SPONSOR_COPY,
  followersLine,
  relationLabel,
  sponsorKindLabel,
} from '@/features/host-page/copy';
import { HostHeader } from '@/features/host-page/HostHeader';
import { SocialsRow } from '@/features/host-page/SocialsRow';
import { HostPageError, HostPageSkeleton, NotListed } from '@/features/host-page/states';
import { UpcomingMeets } from '@/features/host-page/UpcomingMeets';
import { Text } from '@/ui/Text';

// S14 (sponsors.md R-15). The page matches the club page frame for frame
// (sponsors.md Verification); `kind` changes the label and nothing else.
// R-18: the app has no create or edit surface for a sponsor, so the only
// thing here for a business that wants a change is the footer line.
export default function SponsorScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const sponsor = useSponsor(slug);

  const header = <Stack.Screen options={{ title: sponsor.data?.name ?? '' }} />;

  // R-5: a hidden sponsor is a 404, and a page rather than an error.
  if (errorStatus(sponsor.error) === 404) {
    return (
      <>
        {header}
        <NotListed copy={SPONSOR_COPY.hidden} />
      </>
    );
  }

  if (sponsor.isError && !sponsor.data) {
    return (
      <>
        {header}
        <HostPageError
          copy={SPONSOR_COPY.error}
          action={SPONSOR_COPY.errorAction}
          onRetry={() => void sponsor.refetch()}
        />
      </>
    );
  }

  if (!sponsor.data) {
    return (
      <>
        {header}
        <HostPageSkeleton />
      </>
    );
  }

  const data = sponsor.data;

  return (
    <>
      {header}
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {sponsor.isError ? (
          <Text variant="caption" color="secondary" accessibilityRole="alert" style={styles.inset}>
            {HOST_PAGE_COPY.offline}
          </Text>
        ) : null}

        <HostHeader
          name={data.name}
          bannerUrl={data.banner_url}
          avatarUrl={data.logo_url}
          labels={[sponsorKindLabel(data.kind), data.verified ? SPONSOR_COPY.verified : null]}
          homeLabel={data.home_label}
          blurb={data.tagline}
          counts={followersLine(data.followers_count)}
        >
          {data.description ? <Text variant="body">{data.description}</Text> : null}
          <SocialsRow
            links={data.links}
            website={data.website}
            websiteLabel={SPONSOR_COPY.website}
          />
        </HostHeader>

        <UpcomingMeets
          title={SPONSOR_COPY.upcomingHeader}
          events={data.upcoming_events}
          emptyCopy={SPONSOR_COPY.upcomingEmpty}
          seeAll={{
            href: `/meets?sponsor=${data.id}&title=${encodeURIComponent(data.name)}`,
            label: SPONSOR_COPY.seeAll,
          }}
          relationLabelFor={relationLabel}
        />

        {/* R-18: the one thing the app offers a sponsor who wants a change. */}
        <View style={styles.inset}>
          <Text variant="caption" color="secondary">
            {SPONSOR_COPY.footer}
          </Text>
        </View>
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
}));

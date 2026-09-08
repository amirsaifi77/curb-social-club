import { errorDetails, errorStatus, useEvent } from '@curb/api-client';
import { shareEventText } from '@curb/ui';
import * as Linking from 'expo-linking';
import { Stack, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';
import { Platform, ScrollView, Share, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { dayAndTime, shortDate } from '@/components/format';
import {
  AboutBlock,
  CancelledBanner,
  GoingBlock,
  Hero,
  HostBlock,
  PlaceholdersBlock,
  ShareRow,
  SourceBlock,
  SponsorsBlock,
  WhenBlock,
  WhereBlock,
} from '@/features/meet-detail/blocks';
import { addToCalendar } from '@/features/meet-detail/calendar';
import { DETAIL_COPY, dormantLine } from '@/features/meet-detail/copy';
import { MeetSkeleton } from '@/features/meet-detail/MeetSkeleton';
import { NoLongerListed } from '@/features/meet-detail/NoLongerListed';
import { useBrowseLocation } from '@/lib/use-browse-location';
import { Text } from '@/ui/Text';
import { TextButton } from '@/ui/TextButton';

// S08 (event-detail-and-rsvp.md R-11 to R-25). The hero scrolls under a
// transparent header; every block below it is opaque content.
export default function MeetDetailScreen() {
  const { slug, token } = useLocalSearchParams<{ slug: string; token?: string }>();
  const { near } = useBrowseLocation();
  // R-20: `near` fills the nearby list a 410 comes back with.
  const event = useEvent(slug, { ...(token ? { token } : {}), near });
  const [calendarNotice, setCalendarNotice] = useState<string | null>(null);

  const onAddToCalendar = useCallback(async () => {
    const next = event.data?.upcoming_occurrences[0];
    if (!event.data || !next) return;
    const outcome = await addToCalendar({
      title: event.data.title,
      startsAt: next.starts_at,
      endsAt: next.ends_at,
      timezone: next.timezone,
      location: event.data.venue.name,
      notes: event.data.description,
      rrule: event.data.rrule,
      // R-12: a seasonal series ends on a date the payload does not carry,
      // so the calendar gets one entry rather than an endless repeat.
      cadence: event.data.cadence,
    });
    // R-12: only a refusal has something to say; a failure adds nothing and
    // says nothing rather than blaming the person's settings.
    setCalendarNotice(outcome === 'denied' ? DETAIL_COPY.calendarDenied : null);
  }, [event.data]);

  const onDirections = useCallback(() => {
    const venue = event.data?.venue;
    if (!venue) return;
    // R-13: Apple Maps with the coordinates and the name, so the pin lands
    // on the lot rather than on a geocoded guess at the address.
    const query = encodeURIComponent(venue.name);
    const url =
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?ll=${venue.location.lat},${venue.location.lng}&q=${query}`
        : `geo:${venue.location.lat},${venue.location.lng}?q=${query}`;
    void Linking.openURL(url);
  }, [event.data]);

  const onShare = useCallback(() => {
    if (!event.data) return;
    const next = event.data.upcoming_occurrences[0];
    // The Copy table's message already ends with the canonical URL, so
    // passing `url` as well hands iOS two activity items and the link shows
    // up twice in what gets sent.
    void Share.share({
      message: shareEventText({
        title: event.data.title,
        when: next ? dayAndTime(next.starts_at, next.timezone) : null,
        slug: event.data.slug,
        token,
      }),
    });
  }, [event.data, token]);

  const header = (
    <Stack.Screen
      options={{
        title: '',
        headerTransparent: true,
        headerShadowVisible: false,
        headerRight: () => <ShareRow onShare={onShare} />,
      }}
    />
  );

  // R-20: 410 and 404 are a page, not an error state. The API puts the
  // nearby meets in the error's details, which is where ApiError keeps them.
  const status = errorStatus(event.error);
  if (status === 410 || status === 404) {
    const nearby = errorDetails(event.error)?.nearby;
    return (
      <>
        {header}
        <NoLongerListed nearby={Array.isArray(nearby) ? nearby : []} />
      </>
    );
  }

  // An error with a copy already in hand is the offline state further down,
  // not this one: only a failure with nothing to show is an error.
  if (event.isError && !event.data) {
    return (
      <>
        {header}
        <View style={styles.state}>
          <Text variant="body">{DETAIL_COPY.error}</Text>
          <TextButton
            label={DETAIL_COPY.errorAction}
            emphasis="accent"
            onPress={() => void event.refetch()}
          />
        </View>
      </>
    );
  }

  // R-25: a deep link lands here before the fetch resolves, so it is a
  // skeleton of the layout rather than a line of text.
  if (!event.data) {
    return (
      <>
        {header}
        <MeetSkeleton />
      </>
    );
  }

  const meet = event.data;
  const next = meet.upcoming_occurrences[0];
  const cancelled = next?.status === 'cancelled';
  // Screens S08: a refetch that failed over a copy already in hand is a
  // saved copy, not an error. An error with nothing cached was handled above.
  const offline = event.isError;

  return (
    <>
      {header}
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="never"
      >
        <Hero event={meet} />

        <View style={styles.blocks}>
          {offline ? (
            <Text variant="caption" color="secondary" accessibilityRole="alert">
              {DETAIL_COPY.offline}
            </Text>
          ) : null}

          {/* R-19: a cancelled next occurrence says so above everything. */}
          {cancelled ? <CancelledBanner note={next?.override_note ?? null} /> : null}
          {/* events-and-occurrences.md Copy, "Detail, dormant". */}
          {meet.dormant ? (
            <Text variant="body" color="secondary">
              {dormantLine(
                meet.last_confirmed_at
                  ? shortDate(meet.last_confirmed_at, meet.venue.timezone)
                  : null,
              )}
            </Text>
          ) : null}

          <WhenBlock
            event={meet}
            onAddToCalendar={() => void onAddToCalendar()}
            notice={calendarNotice}
          />
          <WhereBlock event={meet} onDirections={onDirections} />
          <HostBlock event={meet} />
          <SponsorsBlock event={meet} />
          <GoingBlock event={meet} />
          <AboutBlock event={meet} />
          <SourceBlock
            event={meet}
            onOpen={() => meet.source && void WebBrowser.openBrowserAsync(meet.source.url)}
          />
          {/* "No photos from this one yet. Were you there?" only makes
              sense for a meet that has happened. A meet whose dates are
              only announced has not. */}
          <PlaceholdersBlock past={hasPassed(meet)} />
        </View>
      </ScrollView>
    </>
  );
}

// A meet is past when its dates are behind us, not when it has no upcoming
// ones: an `announced` meet has no dates yet and has not happened.
function hasPassed(meet: { cadence: string; upcoming_occurrences: unknown[] }): boolean {
  return meet.cadence !== 'announced' && meet.upcoming_occurrences.length === 0;
}

// Read structurally rather than with instanceof: an error crossing a module
// boundary keeps its status and details but not always its prototype.
const styles = StyleSheet.create((theme, rt) => ({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  content: {
    paddingBottom: rt.insets.bottom + theme.spacing['8'],
  },
  blocks: {
    paddingHorizontal: theme.spacing.gutter,
  },
  state: {
    flex: 1,
    gap: theme.spacing['3'],
    padding: theme.spacing.gutter,
    paddingTop: rt.insets.top + theme.spacing['16'],
    backgroundColor: theme.colors.bg,
  },
}));

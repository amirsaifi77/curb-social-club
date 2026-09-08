import type { EventDetail } from '@curb/api-client';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { StyleSheet } from 'react-native-unistyles';

import {
  DETAIL_COPY,
  EVENT_COPY,
  SPONSOR_ROLES,
  cancelledBanner,
  externalHost,
  goingCounts,
  lastConfirmed,
  sourceCard,
} from './copy';

import { dayAndTime, shortDate, sourceLabel } from '@/components/format';
import { HostChip } from '@/components/HostChip';
import { Text } from '@/ui/Text';
import { TextButton } from '@/ui/TextButton';

// R-11's blocks, in order. Every one is an opaque content surface: the hero
// scrolls under a transparent header and nothing but the future CTA is
// tinted (mobile-liquid-glass section 6).

export function Block({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View style={styles.block}>
      {title ? (
        <Text variant="headline" accessibilityRole="header">
          {title}
        </Text>
      ) : null}
      {children}
    </View>
  );
}

export function CancelledBanner({ note }: { note: string | null }) {
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text variant="body" style={styles.bannerText}>
        {cancelledBanner(note)}
      </Text>
    </View>
  );
}

export function WhenBlock({
  event,
  onAddToCalendar,
  notice,
}: {
  event: EventDetail;
  onAddToCalendar: () => void;
  notice: string | null;
}) {
  const next = event.upcoming_occurrences[0];
  const stale = event.last_confirmed_at ? isStale(event.last_confirmed_at) : false;
  // R-12: the next four dates, each opening S09. The one above is not
  // repeated here: the same date twice on one screen reads as two meets.
  const dates = event.upcoming_occurrences.slice(1, 5);

  return (
    <Block>
      {next ? (
        <Text variant="title">{dayAndTime(next.starts_at, next.timezone)}</Text>
      ) : (
        // events-and-occurrences.md Copy, "Detail, announced, no dates".
        <Text variant="body">{EVENT_COPY.announcedNoDates}</Text>
      )}

      {event.recurring && event.rrule_text ? (
        <Text variant="body" color="secondary">
          {event.rrule_text}
        </Text>
      ) : null}

      {stale && event.last_confirmed_at ? (
        <Text variant="caption" color="secondary">
          {lastConfirmed(shortDate(event.last_confirmed_at, next?.timezone))}
        </Text>
      ) : null}

      {dates.length > 0 ? (
        <View style={styles.dates}>
          <Text variant="subhead">{DETAIL_COPY.nextDatesHeader}</Text>
          {dates.map((occurrence) => (
            // Link asChild clones its child with onPress, and a View has no
            // such prop, so the tap is dropped. Pressable is what takes it.
            <Link key={occurrence.id} href={`/occurrences/${occurrence.id}`} asChild>
              <Pressable
                style={styles.dateRow}
                accessibilityRole="link"
                accessibilityLabel={dayAndTime(occurrence.starts_at, occurrence.timezone)}
              >
                <Text variant="body">{dayAndTime(occurrence.starts_at, occurrence.timezone)}</Text>
              </Pressable>
            </Link>
          ))}
        </View>
      ) : null}

      {next ? (
        <TextButton label={DETAIL_COPY.addToCalendar} onPress={onAddToCalendar} />
      ) : null}
      {notice ? (
        <Text variant="caption" color="secondary" accessibilityRole="alert">
          {notice}
        </Text>
      ) : null}
    </Block>
  );
}

export function WhereBlock({ event, onDirections }: { event: EventDetail; onDirections: () => void }) {
  const venue = event.venue;
  const region = {
    latitude: venue.location.lat,
    longitude: venue.location.lng,
    latitudeDelta: SNIPPET_SPAN / 2,
    longitudeDelta: SNIPPET_SPAN,
  };
  const address = [venue.address_line1, venue.address_line2, venue.city, venue.region]
    .filter(Boolean)
    .join(', ');

  return (
    <Block>
      {/* R-13: a still map of the venue, not an interactive one. Panning it
          would fight the page's own scroll, and Directions is the control
          for going anywhere. */}
      <MapView
        style={styles.snippet}
        provider={PROVIDER_DEFAULT}
        region={region}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <Marker coordinate={{ latitude: venue.location.lat, longitude: venue.location.lng }} />
      </MapView>

      <Text variant="title">{venue.name}</Text>
      {address ? (
        <Text variant="body" color="secondary">
          {address}
        </Text>
      ) : null}
      {event.parking_note ? (
        <Text variant="body" color="secondary">{`Parking: ${event.parking_note}`}</Text>
      ) : null}
      <TextButton label={DETAIL_COPY.directions} emphasis="accent" onPress={onDirections} />
    </Block>
  );
}

export function HostBlock({ event }: { event: EventDetail }) {
  return (
    <Block>
      {event.host ? <HostChip host={event.host} /> : null}
      {/* R-14: an imported meet names the account it came from beside the
          app account that hosts it. */}
      {event.external_host_name ? (
        <Text variant="body" color="secondary">
          {externalHost(event.external_host_name)}
        </Text>
      ) : null}
      {event.claimed ? (
        <Text variant="caption" color="secondary">
          {DETAIL_COPY.hostClaimed}
        </Text>
      ) : event.viewer.claim_status === 'pending' ? (
        <Text variant="caption" color="secondary">
          {DETAIL_COPY.hostClaimPending}
        </Text>
      ) : (
        <Text variant="caption" color="secondary">
          {DETAIL_COPY.hostUnclaimed}
        </Text>
      )}
    </Block>
  );
}

export function SponsorsBlock({ event }: { event: EventDetail }) {
  // R-11: the block exists only when there is something in it.
  if (event.sponsorships.length === 0) return null;

  return (
    <Block title={DETAIL_COPY.sponsorsHeader}>
      {event.sponsorships.map((sponsorship) => (
        <Link key={sponsorship.sponsor.id} href={`/sponsors/${sponsorship.sponsor.slug}`} asChild>
          <Pressable
            style={styles.row}
            accessibilityRole="link"
            accessibilityLabel={sponsorship.sponsor.name}
          >
            {sponsorship.sponsor.logo_url ? (
              <Image source={{ uri: sponsorship.sponsor.logo_url }} style={styles.logo} contentFit="contain" />
            ) : null}
            <View style={styles.rowText}>
              <Text variant="body">
                {`${SPONSOR_ROLES[sponsorship.role] ?? 'Partner'} ${sponsorship.sponsor.name}`}
              </Text>
              {sponsorship.note ? (
                <Text variant="caption" color="secondary">
                  {sponsorship.note}
                </Text>
              ) : null}
            </View>
          </Pressable>
        </Link>
      ))}
    </Block>
  );
}

// The Phase 2 CTA lands in this block, so it keeps its place in the order
// and slice 5 does not reflow the screen (the session block's Notes).
export function GoingBlock({ event }: { event: EventDetail }) {
  const next = event.upcoming_occurrences[0];
  const going = next?.going_count ?? 0;

  return (
    <Block>
      {going === 0 ? (
        <Text variant="body" color="secondary">
          {DETAIL_COPY.goingZero}
        </Text>
      ) : (
        // The interested count is not on the detail payload; it arrives with
        // the RSVP slice, which is also when Interested becomes settable.
        <Text variant="body">{goingCounts(going, null)}</Text>
      )}
    </Block>
  );
}

export function AboutBlock({ event }: { event: EventDetail }) {
  if (!event.description) return null;
  return (
    <Block title={DETAIL_COPY.aboutHeader}>
      <Text variant="body">{event.description}</Text>
    </Block>
  );
}

export function SourceBlock({ event, onOpen }: { event: EventDetail; onOpen: () => void }) {
  // R-11: only when the meet came from somewhere.
  if (!event.source) return null;

  return (
    <Block>
      <Text variant="body" color="secondary">
        {sourceCard(sourceLabel(event.source.type), event.external_host_name)}
      </Text>
      <TextButton label={DETAIL_COPY.sourceAction} onPress={onOpen} />
    </Block>
  );
}

export function PlaceholdersBlock({ past }: { past: boolean }) {
  return (
    <>
      <Block>
        <Text variant="body" color="secondary">
          {past ? DETAIL_COPY.photosPast : DETAIL_COPY.photosUpcoming}
        </Text>
      </Block>
      <Block>
        <Text variant="body" color="secondary">
          {DETAIL_COPY.comments}
        </Text>
      </Block>
    </>
  );
}

export function Hero({ event }: { event: EventDetail }) {
  return (
    <View style={styles.hero}>
      {event.cover_url ? (
        <Image
          source={{ uri: event.cover_url }}
          placeholder={event.cover_blurhash ? { blurhash: event.cover_blurhash } : undefined}
          style={styles.cover}
          contentFit="cover"
          accessibilityIgnoresInvertColors
        />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]} />
      )}
      {/* R-11: the title sits on a scrim, the one place a translucent fill
          is allowed in the content layer. */}
      <View style={styles.scrim}>
        <Text variant="display" style={styles.heroTitle}>
          {event.title}
        </Text>
      </View>
    </View>
  );
}

export function ShareRow({ onShare }: { onShare: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={DETAIL_COPY.share} onPress={onShare}>
      <Text variant="subhead">{DETAIL_COPY.share}</Text>
    </Pressable>
  );
}

// The still map shows the block, not the city: about a quarter mile.
export const SNIPPET_SPAN = 0.008;

// R-18 uses the same 30 day clock as `stale`.
export const STALE_DAYS = 30;

export function isStale(lastConfirmedAt: string, now: Date = new Date()): boolean {
  const confirmed = new Date(lastConfirmedAt).getTime();
  if (Number.isNaN(confirmed)) return false;
  return now.getTime() - confirmed > STALE_DAYS * 24 * 60 * 60 * 1000;
}

const styles = StyleSheet.create((theme) => ({
  block: {
    gap: theme.spacing['2'],
    paddingVertical: theme.spacing['5'],
    borderBottomWidth: theme.radius.hairline,
    borderBottomColor: theme.colors.border,
  },
  banner: {
    backgroundColor: theme.colors.error,
    padding: theme.spacing['3'],
    borderRadius: theme.radius.sm,
  },
  bannerText: {
    color: theme.colors.accentInk,
  },
  dates: {
    gap: theme.spacing['1'],
    paddingTop: theme.spacing['2'],
  },
  dateRow: {
    paddingVertical: theme.spacing['3'],
    borderTopWidth: theme.radius.hairline,
    borderTopColor: theme.colors.border,
    minHeight: 44,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing['3'],
    paddingVertical: theme.spacing['2'],
    minHeight: 44,
  },
  rowText: {
    flexShrink: 1,
    gap: theme.spacing['1'],
  },
  logo: {
    width: 40,
    height: 24,
  },
  snippet: {
    width: '100%',
    height: 140,
    borderRadius: theme.radius.card,
    borderWidth: theme.radius.hairline,
    borderColor: theme.colors.border,
  },
  hero: {
    position: 'relative',
  },
  cover: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  coverPlaceholder: {
    backgroundColor: theme.colors.surfaceRaised,
  },
  scrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.scrim,
    padding: theme.spacing.gutter,
  },
  heroTitle: {
    color: theme.colors.pinLabel,
  },
}));

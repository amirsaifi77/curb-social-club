import type { EventSummary } from '@curb/api-client';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { confirmationChip, dayAndTime, miles, sourceLabel } from './format';
import { HostChip } from './HostChip';

import { Text } from '@/ui/Text';


// The feed's event card (discovery R-13). An opaque content surface built
// from tokens: no glass in rows (docs/mobile-liquid-glass.md section 6).
export const SPONSOR_LOGO_LIMIT = 2;

// On S03's sheet a card tap recenters the map rather than opening the meet
// (discovery R-16), so the card can be handed its own press instead of the
// link it carries everywhere else.
export function EventCard({
  event,
  onPress,
}: {
  event: EventSummary;
  onPress?: () => void;
}) {
  const occurrence = event.next_occurrence;
  const distance = miles(event.distance_m);
  const chip = confirmationChip(event);
  const sponsors = event.sponsors_preview.slice(0, SPONSOR_LOGO_LIMIT);

  // Link asChild clones its child with onPress, and a View has no such
  // prop, so a card wrapped in a Link was a dead tap everywhere it appeared.
  const card = (
    <Pressable
      style={styles.card}
      accessibilityRole={onPress ? 'button' : 'link'}
      accessibilityLabel={event.title}
      onPress={onPress}
    >
        {event.cover_url ? (
          <Image
            source={{ uri: event.cover_url }}
            placeholder={event.cover_blurhash ? { blurhash: event.cover_blurhash } : undefined}
            style={styles.cover}
            contentFit="cover"
            accessibilityIgnoresInvertColors
          />
        ) : (
          // Flat placeholder: a solid fill and a hairline, no gradient.
          <View style={[styles.cover, styles.coverPlaceholder]} />
        )}

        <View style={styles.body}>
          {/* Card title, not a detail title: `headline` is the role the
              tokens give card titles and section headers. */}
          <Text variant="headline" numberOfLines={2}>
            {event.title}
          </Text>

          {occurrence ? (
            // `plate` is the tokens' role for times, distances and dates.
            <Text variant="plate" color="secondary">
              {dayAndTime(occurrence.starts_at, occurrence.timezone)}
            </Text>
          ) : (
            <Text variant="body" color="secondary">
              Dates announced by the host
            </Text>
          )}

          <View style={styles.place}>
            <Text variant="body" color="secondary" numberOfLines={1} style={styles.placeName}>
              {event.venue.name}
            </Text>
            {distance ? (
              <Text variant="plate" color="secondary">
                {distance}
              </Text>
            ) : null}
          </View>

          {event.host ? <HostChip host={event.host} /> : null}

          <View style={styles.meta}>
            {event.recurring && event.rrule_text ? (
              <Text variant="caption" style={styles.badge}>
                {event.rrule_text}
              </Text>
            ) : null}
            {occurrence && occurrence.going_count > 0 ? (
              <Text variant="caption" color="secondary">
                {`${occurrence.going_count} going`}
              </Text>
            ) : null}
            {event.source ? (
              <Text variant="caption" style={styles.badge}>
                {sourceLabel(event.source.type)}
              </Text>
            ) : null}
          </View>

          {sponsors.length > 0 ? (
            <View style={styles.sponsors}>
              {sponsors.map((sponsor) =>
                sponsor.logo_url ? (
                  <Image
                    key={sponsor.id}
                    source={{ uri: sponsor.logo_url }}
                    style={styles.logo}
                    contentFit="contain"
                    accessibilityLabel={sponsor.name}
                  />
                ) : (
                  <Text key={sponsor.id} variant="caption" color="secondary">
                    {sponsor.name}
                  </Text>
                ),
              )}
            </View>
          ) : null}

          {chip ? (
            <Text variant="caption" color="secondary">
              {chip}
            </Text>
          ) : null}
      </View>
    </Pressable>
  );

  if (onPress) return card;

  // R-11 and mobile-liquid-glass section 6: the detail screen is pushed
  // with the Apple zoom transition from the card. iOS 18 and up honours it;
  // everywhere else the Link pushes as usual.
  return (
    <Link href={`/meets/${event.slug}`} asChild>
      <Link.AppleZoom>{card}</Link.AppleZoom>
    </Link>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: theme.radius.hairline,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  cover: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  coverPlaceholder: {
    backgroundColor: theme.colors.surfaceRaised,
  },
  body: {
    padding: theme.spacing['4'],
    gap: theme.spacing['2'],
  },
  place: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: theme.spacing['2'],
  },
  placeName: {
    flexShrink: 1,
  },
  meta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: theme.spacing['2'],
  },
  badge: {
    borderWidth: theme.radius.hairline,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing['2'],
    paddingVertical: theme.spacing['1'],
  },
  sponsors: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing['3'],
  },
  logo: {
    width: 48,
    height: 20,
  },
}));

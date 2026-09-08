import type { ClubSummary, EventSummary, SponsorSummary } from '@curb/api-client';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { GROUP_TITLES, SEARCH_COPY } from './copy';
import type { Place } from './places';

import { EventCard } from '@/components/EventCard';
import { HostRowCard, toHostRowCard } from '@/components/HostRowCard';
import { Text } from '@/ui/Text';
import { TextButton } from '@/ui/TextButton';

export interface SearchGroups {
  events: EventSummary[];
  clubs: ClubSummary[];
  sponsors: SponsorSummary[];
  places: Place[];
}

// R-20: Events, Clubs, Sponsors, Places, in that order, and a group with
// nothing in it does not render a title above nothing.
export function SearchResults({
  groups,
  onPickPlace,
}: {
  groups: SearchGroups;
  onPickPlace: (place: Place) => void;
}) {
  return (
    <View style={styles.groups}>
      <Group title={GROUP_TITLES.events} count={groups.events.length}>
        {groups.events.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
      </Group>

      <Group title={GROUP_TITLES.clubs} count={groups.clubs.length}>
        {groups.clubs.map((club) => (
          <HostRowCard key={club.id} layout="list" {...toHostRowCard(club, 'club')} />
        ))}
      </Group>

      {/* sponsors.md R-17: the Sponsors group comes after Clubs. */}
      <Group title={GROUP_TITLES.sponsors} count={groups.sponsors.length}>
        {groups.sponsors.map((sponsor) => (
          <HostRowCard key={sponsor.id} layout="list" {...toHostRowCard(sponsor, 'sponsor')} />
        ))}
      </Group>

      <Group title={GROUP_TITLES.places} count={groups.places.length}>
        {groups.places.map((place) => (
          <TextButton key={place.id} label={place.label} onPress={() => onPickPlace(place)} />
        ))}
      </Group>
    </View>
  );
}

function Group({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <View style={styles.group}>
      <Text variant="headline" accessibilityRole="header">
        {title}
      </Text>
      <View style={styles.rows}>{children}</View>
    </View>
  );
}

export function Recents({
  recents,
  onPick,
}: {
  recents: string[];
  onPick: (query: string) => void;
}) {
  if (recents.length === 0) return null;
  return (
    <View style={styles.group}>
      <Text variant="headline" accessibilityRole="header">
        {SEARCH_COPY.recentsHeader}
      </Text>
      <View style={styles.rows}>
        {recents.map((query) => (
          <TextButton key={query} label={query} onPress={() => onPick(query)} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  groups: {
    gap: theme.spacing['6'],
  },
  group: {
    gap: theme.spacing['3'],
  },
  rows: {
    gap: theme.spacing['3'],
  },
}));

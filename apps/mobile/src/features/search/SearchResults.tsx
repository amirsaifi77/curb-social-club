import type { ClubSummary, EventSummary, SponsorSummary } from '@curb/api-client';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { GROUP_TITLES, SEARCH_COPY } from './copy';
import type { Place } from './places';

import { EventCard } from '@/components/EventCard';
import { HostRowCard, toHostRowCard } from '@/components/HostRowCard';
import { Text } from '@/ui/Text';

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

      <Group title={GROUP_TITLES.places} count={groups.places.length} layout="rows">
        {groups.places.map((place) => (
          <ResultRow key={place.id} label={place.label} onPress={() => onPickPlace(place)} />
        ))}
      </Group>
    </View>
  );
}

// A recent and a place are list rows, not buttons: left-aligned text on a
// hairline rule, the flat rendering the brand guide asks for. A row of
// centred pills is not a list (mobile-liquid-glass section 6).
function ResultRow({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.row}>
      <Text variant="body">{label}</Text>
    </Pressable>
  );
}

function Group({
  title,
  count,
  children,
  layout = 'cards',
}: {
  title: string;
  count: number;
  children: React.ReactNode;
  layout?: 'cards' | 'rows';
}) {
  if (count === 0) return null;
  return (
    <View style={styles.group}>
      <Text variant="headline" accessibilityRole="header">
        {title}
      </Text>
      <View style={layout === 'rows' ? styles.list : styles.rows}>{children}</View>
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
      <View style={styles.list}>
        {recents.map((query) => (
          <ResultRow key={query} label={query} onPress={() => onPick(query)} />
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
  list: {
    gap: 0,
  },
  row: {
    paddingVertical: theme.spacing['3'],
    borderBottomWidth: theme.radius.hairline,
    borderBottomColor: theme.colors.border,
    minHeight: 44,
    justifyContent: 'center',
  },
}));

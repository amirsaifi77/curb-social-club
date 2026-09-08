import type { ClubSummary, SponsorSummary } from '@curb/api-client';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from '@/ui/Text';

// clubs R-17 and sponsors R-16: the two rows are one component, so they are
// identical in weight and a sponsor card can never grow a "Sponsored"
// label the clubs row does not have.

export interface HostRowCardProps {
  name: string;
  slug: string;
  imageUrl: string | null;
  label: string | null;
  kind: 'club' | 'sponsor';
  layout?: HostRowLayout;
}

// The feed shows these in a horizontal row of fixed-width cards; search
// shows them stacked. One component either way, so clubs and sponsors stay
// identical in weight wherever they appear (clubs R-17, sponsors R-16).
export type HostRowLayout = 'card' | 'list';

export function toHostRowCard(
  item: ClubSummary | SponsorSummary,
  kind: 'club' | 'sponsor',
): HostRowCardProps {
  const imageUrl = 'avatar_url' in item ? item.avatar_url : item.logo_url;
  return {
    name: item.name,
    slug: item.slug,
    imageUrl: imageUrl ?? null,
    label: item.home_label ?? null,
    kind,
  };
}

export function HostRowCard({
  name,
  slug,
  imageUrl,
  label,
  kind,
  layout = 'card',
}: HostRowCardProps) {
  return (
    // Link asChild clones its child with onPress, and a View has no such
    // prop: every club and sponsor row was a dead tap.
    <Link href={kind === 'club' ? `/clubs/${slug}` : `/sponsors/${slug}`} asChild>
      <Pressable
        style={[styles.card, layout === 'list' && styles.list]}
        accessibilityRole="link"
        accessibilityLabel={name}
      >
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={[styles.image, styles.placeholder]} />
        )}
        <Text variant="body" numberOfLines={2}>
          {name}
        </Text>
        {label ? (
          <Text variant="caption" color="secondary" numberOfLines={1}>
            {label}
          </Text>
        ) : null}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create((theme) => ({
  card: {
    width: 148,
    padding: theme.spacing['3'],
    gap: theme.spacing['2'],
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.card,
    borderWidth: theme.radius.hairline,
    borderColor: theme.colors.border,
  },
  list: {
    width: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing['3'],
  },
  image: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.pill,
  },
  placeholder: {
    backgroundColor: theme.colors.surfaceRaised,
  },
}));

import { Image } from 'expo-image';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from '@/ui/Text';

// One header for all three host pages (clubs R-15, sponsors R-15, profiles
// R-17). The sponsors spec asks that the club and sponsor pages match frame
// for frame, so only the label under the name differs: a kind for a
// sponsor, "Verified club" for a club, "Host" for a person who hosts.

export interface HostHeaderProps {
  name: string;
  /** @ handle under the name, on a profile only. */
  handle?: string | null;
  bannerUrl?: string | null;
  avatarUrl?: string | null;
  /** Small labels under the name: kind, verified, host badge. */
  labels?: (string | null | undefined)[];
  homeLabel?: string | null;
  /** Tagline (sponsor) or bio (profile or club description). */
  blurb?: string | null;
  /** "128 followers. 3 meets." or "120 followers". */
  counts?: string | null;
  children?: React.ReactNode;
}

export function HostHeader({
  name,
  handle,
  bannerUrl,
  avatarUrl,
  labels = [],
  homeLabel,
  blurb,
  counts,
  children,
}: HostHeaderProps) {
  const shown = labels.filter((label): label is string => Boolean(label));

  return (
    <View style={styles.header}>
      {bannerUrl ? (
        <Image source={{ uri: bannerUrl }} style={styles.banner} contentFit="cover" />
      ) : (
        // Flat placeholder: a solid fill, no gradient (brand-guide section 4).
        <View style={[styles.banner, styles.bannerPlaceholder]} />
      )}

      <View style={styles.body}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]} />
        )}

        {/* brand-guide section 6: a host's own name is the serif. */}
        <Text variant="title" accessibilityRole="header">
          {name}
        </Text>
        {handle ? (
          <Text variant="body" color="secondary">
            @{handle}
          </Text>
        ) : null}

        {shown.length > 0 ? (
          <View style={styles.labels}>
            {shown.map((label) => (
              <Text key={label} variant="caption" color="secondary">
                {label}
              </Text>
            ))}
          </View>
        ) : null}

        {homeLabel ? (
          <Text variant="body" color="secondary">
            {homeLabel}
          </Text>
        ) : null}
        {blurb ? <Text variant="body">{blurb}</Text> : null}
        {counts ? (
          <Text variant="caption" color="secondary">
            {counts}
          </Text>
        ) : null}
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  header: {
    gap: theme.spacing['3'],
  },
  banner: {
    width: '100%',
    aspectRatio: 3,
  },
  bannerPlaceholder: {
    backgroundColor: theme.colors.surfaceRaised,
  },
  body: {
    paddingHorizontal: theme.spacing.gutter,
    gap: theme.spacing['2'],
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: theme.radius.pill,
    marginTop: -theme.spacing['8'],
    borderWidth: 2,
    borderColor: theme.colors.bg,
  },
  avatarPlaceholder: {
    backgroundColor: theme.colors.surfaceRaised,
  },
  labels: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing['3'],
  },
}));

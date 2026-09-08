import type { Host } from '@curb/api-client';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { hostHref } from './format';

import { Text } from '@/ui/Text';


// The one Host shape everywhere a host appears (CLAUDE.md). The chip reads
// the same for a user, a club, and a sponsor; only the link target differs.
export function HostChip({ host }: { host: Host }) {
  const href = hostHref(host);
  const body = (
    <View style={styles.chip}>
      {host.avatar_url ? (
        <Image source={{ uri: host.avatar_url }} style={styles.avatar} contentFit="cover" />
      ) : (
        <View style={[styles.avatar, styles.placeholder]} />
      )}
      <Text variant="caption" numberOfLines={1}>
        {host.name ?? 'Unlisted host'}
      </Text>
      {host.verified ? (
        <Text variant="caption" color="secondary" accessibilityLabel="Verified">
          Verified
        </Text>
      ) : null}
    </View>
  );

  if (!href) return body;

  return (
    <Link href={href} accessibilityRole="link" accessibilityLabel={`Open ${host.name ?? 'host'}`}>
      {body}
    </Link>
  );
}

const styles = StyleSheet.create((theme) => ({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing['2'],
    paddingVertical: theme.spacing['1'],
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: theme.radius.pill,
  },
  placeholder: {
    backgroundColor: theme.colors.surfaceRaised,
    borderWidth: theme.radius.hairline,
    borderColor: theme.colors.border,
  },
}));

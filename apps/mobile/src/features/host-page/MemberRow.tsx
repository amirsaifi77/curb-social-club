import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { roleLabel } from './copy';

import { Text } from '@/ui/Text';

// clubs R-16: one member, with the Owner or Admin label when there is one.
// The app account never gets a label (clubs.md Risks), which `roleLabel`
// decides in one place so S12's row and S13's list cannot disagree.

export interface MemberRowProps {
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  role?: string | null;
}

export function MemberRow({ handle, displayName, avatarUrl, role }: MemberRowProps) {
  const label = roleLabel(role, handle);

  return (
    <Link href={`/u/${handle}`} asChild>
      <Pressable style={styles.row} accessibilityRole="link" accessibilityLabel={displayName}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} contentFit="cover" />
        ) : (
          <View style={[styles.avatar, styles.placeholder]} />
        )}
        <View style={styles.names}>
          <Text variant="body" numberOfLines={1}>
            {displayName}
          </Text>
          <Text variant="caption" color="secondary" numberOfLines={1}>
            @{handle}
          </Text>
        </View>
        {label ? (
          <Text variant="caption" color="secondary">
            {label}
          </Text>
        ) : null}
      </Pressable>
    </Link>
  );
}

export const MEMBERS_PREVIEW = 8;

// The eight avatars on S12 (clubs R-15). Tapping one opens that profile;
// the row's count copy sits above it.
export function MemberAvatars({
  members,
}: {
  members: readonly { id: string; handle: string; display_name: string; avatar_url: string | null }[];
}) {
  return (
    <View style={styles.avatars}>
      {members.map((member) => (
        <Link key={member.id} href={`/u/${member.handle}`} asChild>
          <Pressable accessibilityRole="link" accessibilityLabel={member.display_name}>
            {member.avatar_url ? (
              <Image source={{ uri: member.avatar_url }} style={styles.avatar} contentFit="cover" />
            ) : (
              <View style={[styles.avatar, styles.placeholder]} />
            )}
          </Pressable>
        </Link>
      ))}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing['3'],
    paddingVertical: theme.spacing['2'],
  },
  names: {
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.pill,
  },
  placeholder: {
    backgroundColor: theme.colors.surfaceRaised,
  },
  avatars: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing['2'],
  },
}));

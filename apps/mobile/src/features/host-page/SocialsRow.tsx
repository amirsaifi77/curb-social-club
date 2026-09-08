import { socialLinks, websiteUrl, type SocialPlatform } from '@curb/ui';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import * as WebBrowser from 'expo-web-browser';
import { Linking, Pressable, View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';

import { Text } from '@/ui/Text';

// profiles-and-follow.md R-18 and sponsors.md R-15: the socials a host
// already uses, as icon links. `Linking.openURL` on an https address is
// what lets iOS hand the link to the installed app; the website is the one
// that opens in the in-app browser, so it never leaves the page behind.
// No OAuth, no in-app login, ever.

type SymbolName = SymbolViewProps['name'];

const SYMBOLS: Record<SocialPlatform, SymbolName> = {
  instagram: 'camera',
  youtube: 'play.rectangle',
  tiktok: 'music.note',
  x: 'at',
  threads: 'at.circle',
};

const NAMES: Record<SocialPlatform, string> = {
  instagram: 'Instagram',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  x: 'X',
  threads: 'Threads',
};

export interface SocialsRowProps {
  links: Record<string, string> | null | undefined;
  /** A sponsor's `website` column; a profile keeps its site in `links`. */
  website?: string | null;
  /** sponsors.md Copy: the sponsor page labels its site "Website". */
  websiteLabel?: string;
}

export function SocialsRow({ links, website, websiteLabel }: SocialsRowProps) {
  const socials = socialLinks(links);
  const site = websiteUrl(website ?? links?.website ?? null);
  if (socials.length === 0 && !site) return null;

  return (
    <View style={styles.row}>
      {socials.map((link) => (
        <Pressable
          key={link.platform}
          accessibilityRole="link"
          accessibilityLabel={NAMES[link.platform]}
          onPress={() => void Linking.openURL(link.url)}
          style={styles.icon}
        >
          <SymbolView name={SYMBOLS[link.platform]} />
        </Pressable>
      ))}

      {site ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={websiteLabel ?? 'Website'}
          onPress={() => void WebBrowser.openBrowserAsync(site)}
          style={styles.icon}
        >
          {websiteLabel ? (
            <Text variant="body" color="secondary">
              {websiteLabel}
            </Text>
          ) : (
            <SymbolView name="link" />
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create((theme) => ({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: theme.spacing['4'],
    paddingVertical: theme.spacing['1'],
  },
  icon: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
  },
}));

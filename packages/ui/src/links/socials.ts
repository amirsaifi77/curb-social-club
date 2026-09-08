// profiles-and-follow.md R-18 and R-2: a profile's `links` are handles, not
// URLs, so the client builds the address. iOS routes an https link to the
// installed app; the website is the one that opens in an in-app browser.
// Web (W06) renders the same addresses as anchors, so the builder is shared.

export type SocialPlatform = 'instagram' | 'youtube' | 'tiktok' | 'x' | 'threads';

// R-18 lists these five, in this order. The website is not one of them: it
// is already a URL and it opens differently.
export const SOCIAL_PLATFORMS: readonly SocialPlatform[] = [
  'instagram',
  'youtube',
  'tiktok',
  'x',
  'threads',
] as const;

const TEMPLATES: Record<SocialPlatform, (handle: string) => string> = {
  instagram: (handle) => `https://instagram.com/${handle}`,
  youtube: (handle) => `https://youtube.com/@${handle}`,
  tiktok: (handle) => `https://tiktok.com/@${handle}`,
  x: (handle) => `https://x.com/${handle}`,
  threads: (handle) => `https://threads.net/@${handle}`,
};

export function isSocialPlatform(key: string): key is SocialPlatform {
  return (SOCIAL_PLATFORMS as readonly string[]).includes(key);
}

// R-2 stores handles without a leading @, but a hand-seeded row can still
// carry one, and a stored value is not a promise. A handle that is empty
// after trimming has no address, and one carrying a slash or a space would
// build a link to somewhere else entirely, so both answer null.
export function socialUrl(platform: SocialPlatform, handle: string): string | null {
  const trimmed = handle.trim().replace(/^@+/, '');
  if (trimmed === '') return null;
  if (!/^[A-Za-z0-9._-]+$/.test(trimmed)) return null;
  return TEMPLATES[platform](trimmed);
}

export interface SocialLink {
  platform: SocialPlatform;
  handle: string;
  url: string;
}

// The row R-17 asks for: the platforms present in `links`, in R-18's order,
// skipping any whose stored value cannot make an address.
export function socialLinks(links: Record<string, string> | null | undefined): SocialLink[] {
  if (!links) return [];
  const out: SocialLink[] = [];
  for (const platform of SOCIAL_PLATFORMS) {
    const handle = links[platform];
    if (typeof handle !== 'string') continue;
    const url = socialUrl(platform, handle);
    if (url) out.push({ platform, handle: handle.trim().replace(/^@+/, ''), url });
  }
  return out;
}

// R-2 allows only http and https, at most 200 chars, with a host. A stored
// value that fails that is not opened: an in-app browser handed a
// javascript: or file: URL is a way into the app, not a website.
export function websiteUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > 200) return null;
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
  if (!parsed.hostname) return null;
  return parsed.toString();
}

import type { Route } from './+types/og.placeholder[.png]';

import { OG_CACHE_CONTROL, renderOgPng } from '~/lib/og.server';

// clubs.md R-21: "og:image (banner or a flat brand placeholder)". A host
// with no banner still needs a card, or the link unfurls as a bare title.
// The same renderer as W14, so the placeholder is the brand's own flat
// card rather than a second design nobody maintains.
const COLORS = {
  bg: '#F3F4F4',
  text: '#23272A',
  muted: '#5C6469',
  border: '#D5D9DB',
  surface: '#FFFFFF',
};

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const title = url.searchParams.get('title')?.slice(0, 120) ?? 'curb';
  const subtitle = url.searchParams.get('subtitle')?.slice(0, 120) ?? '';

  const png = await renderOgPng({
    title,
    when: null,
    venue: subtitle,
    coverUrl: null,
    colors: COLORS,
  });

  return new Response(png as BodyInit, {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': OG_CACHE_CONTROL },
  });
}

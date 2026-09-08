import { Resvg } from '@resvg/resvg-js';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import satori from 'satori';

// web.md R-16: the 1200x630 card that unfurls in iMessage and Instagram.
// Flat by construction: solid fills, one hairline rule, no gradients and no
// shadows (brand-guide section 4), which is also all Satori can draw.

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;
export const OG_CACHE_CONTROL = 'public, s-maxage=3600, stale-while-revalidate=86400';

const require = createRequire(import.meta.url);

// The same subsets mobile ships. Satori takes ttf, otf or woff, never
// woff2, so these are the .ttf files rather than the ones root.tsx serves.
const FONT_FILES = {
  serif: 'InstrumentSerif-Regular.ttf',
  regular: 'Geist-Regular.ttf',
  medium: 'Geist-Medium.ttf',
} as const;

let fontCache: Awaited<ReturnType<typeof loadFonts>> | null = null;

async function loadFonts() {
  const entries = await Promise.all(
    Object.entries(FONT_FILES).map(async ([key, file]) => {
      const path = require.resolve(`@curb/design-tokens/fonts/${file}`);
      return [key, await readFile(path)] as const;
    }),
  );
  const byKey = Object.fromEntries(entries) as Record<keyof typeof FONT_FILES, Buffer>;
  return [
    { name: 'Instrument Serif', data: byKey.serif, weight: 400 as const, style: 'normal' as const },
    { name: 'Geist', data: byKey.regular, weight: 400 as const, style: 'normal' as const },
    { name: 'Geist', data: byKey.medium, weight: 500 as const, style: 'normal' as const },
  ];
}

export async function fonts() {
  fontCache ??= await loadFonts();
  return fontCache;
}

// Satori fetches an <img src> itself, with no timeout: a slow CDN would
// hang the route that every link preview hits. Fetching it here bounds the
// wait and keeps the bytes under our own eye (ADR 0011), and a cover that
// does not arrive becomes the placeholder rather than a stalled request.
export const COVER_TIMEOUT_MS = 2_500;
export const COVER_MAX_BYTES = 4 * 1024 * 1024;

export async function loadCover(
  url: string | null,
  fetchImpl: typeof fetch = fetch,
  timeoutMs = COVER_TIMEOUT_MS,
): Promise<string | null> {
  if (!url) return null;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null;

  try {
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) return null;
    const type = response.headers.get('content-type') ?? '';
    if (!type.startsWith('image/')) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength === 0 || bytes.byteLength > COVER_MAX_BYTES) return null;
    return `data:${type.split(';')[0]};base64,${Buffer.from(bytes).toString('base64')}`;
  } catch {
    // A timeout, a DNS failure, a 500: all the same answer to this card.
    return null;
  }
}

export interface OgCardInput {
  title: string;
  /** "Sat, Oct 24, 7:30 am", already in the venue's clock. */
  when: string | null;
  venue: string;
  /** A data: URI from loadCover. Null renders the flat placeholder (R-16). */
  coverUrl: string | null;
  colors: { bg: string; text: string; muted: string; border: string; surface: string };
}

// Satori takes a React-ish element tree, so this is written as plain objects
// rather than JSX: the file is loaded on the server only and JSX here would
// pull a runtime in for no reason.
function element(type: string, props: Record<string, unknown>): Record<string, unknown> {
  return { type, props };
}

export function ogCard(input: OgCardInput) {
  const { colors } = input;

  const cover = input.coverUrl
    ? element('img', {
        src: input.coverUrl,
        width: OG_WIDTH,
        height: 300,
        style: { objectFit: 'cover', width: OG_WIDTH, height: 300 },
      })
    : // The flat placeholder: a solid fill, no gradient, no car silhouette.
      element('div', {
        style: { width: OG_WIDTH, height: 300, backgroundColor: colors.surface },
      });

  return element('div', {
    style: {
      display: 'flex',
      flexDirection: 'column',
      width: OG_WIDTH,
      height: OG_HEIGHT,
      backgroundColor: colors.bg,
      color: colors.text,
      fontFamily: 'Geist',
    },
    children: [
      cover,
      element('div', {
        style: {
          display: 'flex',
          flexDirection: 'column',
          flexGrow: 1,
          padding: '40px 56px',
          justifyContent: 'space-between',
        },
        children: [
          element('div', {
            style: { display: 'flex', flexDirection: 'column', gap: 16 },
            children: [
              element('div', {
                style: {
                  fontFamily: 'Instrument Serif',
                  fontSize: 64,
                  lineHeight: 1.05,
                  // Two lines at most: a third would push the venue off the
                  // card, and a truncated title reads worse than a wrapped one.
                  display: 'block',
                  lineClamp: 2,
                },
                children: input.title,
              }),
              // The thin rule R-16 names: one hairline, not a divider block.
              element('div', {
                style: { width: 96, height: 1, backgroundColor: colors.border },
              }),
              element('div', {
                style: { fontSize: 28, color: colors.muted },
                children: [input.when, input.venue].filter(Boolean).join('  |  '),
              }),
            ],
          }),
          element('div', {
            style: { fontFamily: 'Instrument Serif', fontSize: 36, color: colors.text },
            children: 'curb',
          }),
        ],
      }),
    ],
  });
}

export async function renderOgPng(input: OgCardInput): Promise<Uint8Array> {
  const svg = await satori(ogCard(input) as never, {
    width: OG_WIDTH,
    height: OG_HEIGHT,
    fonts: await fonts(),
  });
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: OG_WIDTH } });
  return resvg.render().asPng();
}

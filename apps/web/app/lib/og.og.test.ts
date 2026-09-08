import { describe, expect, it, vi } from 'vitest';


import { dayAndTime } from './format';
import { OG_CACHE_CONTROL, OG_HEIGHT, OG_WIDTH, loadCover, ogCard, renderOgPng } from './og.server';

import { eventDetail } from '~/test/fixtures';

// web.md AC-12: three cards, 1200x630, an hour at the edge, the placeholder
// when there is no cover, and never a byte of Instagram media.

const COLORS = {
  bg: '#F3F4F4',
  text: '#23272A',
  muted: '#5C6469',
  border: '#D5D9DB',
  surface: '#FFFFFF',
};

function cardFor(event: ReturnType<typeof eventDetail>) {
  const next = event.upcoming_occurrences[0] ?? null;
  return {
    title: event.title,
    when: next ? dayAndTime(next.starts_at, next.timezone) : null,
    venue: [event.venue.name, event.venue.city].filter(Boolean).join(', '),
    coverUrl: event.cover_url,
    colors: COLORS,
  };
}

// PNG header: the 8-byte signature, then IHDR with width and height as
// big-endian 32-bit integers. Reading them is how the card's size is
// checked without trusting the renderer's own report.
function pngSize(png: Uint8Array): { width: number; height: number } {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

// A 1x1 red PNG as a data URI: Satori draws it without a network call, so
// the cover path is exercised rather than quietly falling back.
const RED_PIXEL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('the meet OG card', () => {
  it('AC-12: a meet with a cover renders a 1200x630 PNG with the cover in it', async () => {
    const withCover = await renderOgPng({ ...cardFor(eventDetail()), coverUrl: RED_PIXEL });
    const withoutCover = await renderOgPng(cardFor(eventDetail({ cover_url: null })));

    expect([...withCover.slice(0, 8)]).toEqual(PNG_SIGNATURE);
    expect(pngSize(withCover)).toEqual({ width: OG_WIDTH, height: OG_HEIGHT });
    // Different bytes: the cover really drew, rather than falling through
    // to the placeholder the way an unreachable URL does.
    expect(Buffer.from(withCover).equals(Buffer.from(withoutCover))).toBe(false);
  });

  it('AC-12: a meet with no cover renders the placeholder at the same size', async () => {
    const png = await renderOgPng(cardFor(eventDetail({ cover_url: null })));

    expect(pngSize(png)).toEqual({ width: OG_WIDTH, height: OG_HEIGHT });
  });

  it('AC-12: the placeholder is a solid band of the same height as a cover', () => {
    // Reading the canvas size alone would pass on an empty div, since the
    // card is 1200x630 either way.
    const card = JSON.stringify(ogCard(cardFor(eventDetail({ cover_url: null }))));

    expect(card).toContain('"height":300');
    expect(card).toContain(`"backgroundColor":"${COLORS.surface}"`);
  });

  it('AC-12: a cover on Instagram CDN is refused, not inlined', async () => {
    // ADR 0011: Instagram media is never fetched, stored or copied. The API
    // refuses to store it, so this is the second lock rather than the
    // first, and it goes through the real fetch path.
    const fetchMock = vi.fn(
      async () =>
        new Response(Uint8Array.from([0x89, 0x50]), {
          status: 200,
          headers: { 'content-type': 'image/jpeg' },
        }),
    );

    for (const url of [
      'https://scontent.cdninstagram.com/v/t51/whatever.jpg',
      'https://instagram.com/p/abc/media',
      'https://scontent-lax3-1.xx.fbcdn.net/v/x.jpg',
    ]) {
      expect(await loadCover(url, fetchMock as unknown as typeof fetch)).toBeNull();
    }
    // Refused before the request, not after it.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('AC-12: a cover we host is fetched as usual', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(Uint8Array.from([0x89, 0x50, 0x4e, 0x47]), {
          status: 200,
          headers: { 'content-type': 'image/png' },
        }),
    );

    const uri = await loadCover(
      'https://media.curbsocial.club/covers/lido.png',
      fetchMock as unknown as typeof fetch,
    );

    expect(uri?.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('the card is flat: no gradient, no shadow', () => {
    // brand-guide section 4, and the one thing Satori would silently drop
    // rather than fail on.
    const card = JSON.stringify(ogCard(cardFor(eventDetail())));

    expect(card).not.toContain('gradient');
    expect(card).not.toContain('boxShadow');
  });

  it('names the meet, the date and the venue, and signs off with the wordmark', () => {
    const card = JSON.stringify(ogCard(cardFor(eventDetail())));

    expect(card).toContain('Lido Saturday');
    expect(card).toContain('Lido Marina Village, Newport Beach');
    expect(card).toContain('Sat, Oct 24, 7:30 am');
    expect(card).toContain('"curb"');
  });

  it('R-16: an hour at the edge, and a day of stale-while-revalidate', () => {
    expect(OG_CACHE_CONTROL).toBe('public, s-maxage=3600, stale-while-revalidate=86400');
  });
});

// The cover is fetched here rather than by Satori, so the route that every
// link preview hits cannot be held open by someone else's CDN.
describe('loadCover', () => {
  it('returns a data URI so the renderer makes no request of its own', async () => {
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47]);
    const fetchMock = async () =>
      new Response(png, { status: 200, headers: { 'content-type': 'image/png' } });

    const uri = await loadCover('https://cdn.example/covers/lido.png', fetchMock as typeof fetch);

    expect(uri?.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('gives up on a slow CDN rather than holding the card open', async () => {
    const fetchMock = (_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('TimeoutError')));
      });

    await expect(
      loadCover('https://cdn.example/slow.png', fetchMock as unknown as typeof fetch, 20),
    ).resolves.toBeNull();
  });

  it('refuses anything that is not an image over http or https', async () => {
    const html = async () =>
      new Response('<html></html>', { status: 200, headers: { 'content-type': 'text/html' } });

    expect(await loadCover('file:///etc/passwd')).toBeNull();
    expect(await loadCover('not a url')).toBeNull();
    expect(await loadCover(null)).toBeNull();
    expect(await loadCover('https://cdn.example/x', html as typeof fetch)).toBeNull();
  });

  it('answers null for a cover that is not there', async () => {
    const missing = async () => new Response('', { status: 404 });

    expect(await loadCover('https://cdn.example/gone.png', missing as typeof fetch)).toBeNull();
  });
});

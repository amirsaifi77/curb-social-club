import { describe, expect, it } from 'vitest';

import { socialLinks, socialUrl, websiteUrl } from './socials';

// profiles-and-follow.md R-18: the five addresses, word for word.
describe('socialUrl', () => {
  it('builds each platform address the spec names', () => {
    expect(socialUrl('instagram', 'backbayaircooled')).toBe(
      'https://instagram.com/backbayaircooled',
    );
    expect(socialUrl('youtube', 'backbayaircooled')).toBe('https://youtube.com/@backbayaircooled');
    expect(socialUrl('tiktok', 'backbayaircooled')).toBe('https://tiktok.com/@backbayaircooled');
    expect(socialUrl('x', 'backbay')).toBe('https://x.com/backbay');
    expect(socialUrl('threads', 'backbay')).toBe('https://threads.net/@backbay');
  });

  it('drops a leading @ that a hand-seeded row kept', () => {
    expect(socialUrl('instagram', '@backbay')).toBe('https://instagram.com/backbay');
  });

  it('refuses a stored value that would build a link to somewhere else', () => {
    expect(socialUrl('instagram', 'backbay/../curb')).toBeNull();
    expect(socialUrl('instagram', 'back bay')).toBeNull();
    expect(socialUrl('instagram', '   ')).toBeNull();
    expect(socialUrl('instagram', '@')).toBeNull();
  });
});

describe('socialLinks', () => {
  it('keeps R-18 order rather than the order the object happens to have', () => {
    const links = { x: 'backbay', instagram: 'backbay', threads: 'backbay' };
    expect(socialLinks(links).map((link) => link.platform)).toEqual([
      'instagram',
      'x',
      'threads',
    ]);
  });

  it('ignores the website key and anything that is not a platform', () => {
    const links = { website: 'https://example.com', myspace: 'backbay', instagram: 'backbay' };
    expect(socialLinks(links).map((link) => link.platform)).toEqual(['instagram']);
  });

  it('has nothing to render for a profile with no links', () => {
    expect(socialLinks(null)).toEqual([]);
    expect(socialLinks({})).toEqual([]);
  });
});

describe('websiteUrl', () => {
  it('keeps an http or https address', () => {
    expect(websiteUrl('https://backbayaircooled.com')).toBe('https://backbayaircooled.com/');
  });

  it('refuses a scheme that is a way into the app rather than a website', () => {
    expect(websiteUrl('javascript:alert(1)')).toBeNull();
    expect(websiteUrl('file:///etc/passwd')).toBeNull();
    expect(websiteUrl('curb://meets/lido-saturday')).toBeNull();
  });

  it('refuses anything that is not a URL at all', () => {
    expect(websiteUrl('backbayaircooled.com')).toBeNull();
    expect(websiteUrl('')).toBeNull();
    expect(websiteUrl(null)).toBeNull();
    expect(websiteUrl(`https://example.com/${'x'.repeat(200)}`)).toBeNull();
  });
});

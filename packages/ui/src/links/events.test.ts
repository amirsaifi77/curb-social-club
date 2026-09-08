import { describe, expect, it } from 'vitest';

import {
  SHARE_BASE_URL,
  canonicalEventUrl,
  canonicalOccurrenceUrl,
  shareEventText,
} from './events';

// docs/specs/event-detail-and-rsvp.md R-23, AC-17, and the Copy table's
// share message.
describe('event links', () => {
  it('R-23: the canonical URL is the web page for the slug', () => {
    expect(canonicalEventUrl('back-bay-coffee-a1b2c3')).toBe(
      `${SHARE_BASE_URL}/meets/back-bay-coffee-a1b2c3`,
    );
  });

  it('AC-17: an unlisted event keeps its token, or the link is a 404', () => {
    expect(canonicalEventUrl('secret-meet', 'tok_123')).toBe(
      `${SHARE_BASE_URL}/meets/secret-meet?token=tok_123`,
    );
    // A null token is not a token.
    expect(canonicalEventUrl('secret-meet', null)).toBe(`${SHARE_BASE_URL}/meets/secret-meet`);
  });

  it('escapes anything in a slug or token that would break the URL', () => {
    expect(canonicalEventUrl('a b&c', 'x/y?z')).toBe(
      `${SHARE_BASE_URL}/meets/a%20b%26c?token=x%2Fy%3Fz`,
    );
  });

  it('builds the share message from the Copy table', () => {
    expect(
      shareEventText({
        title: 'Back Bay Coffee',
        when: 'Sat 7:30 am',
        slug: 'back-bay-coffee-a1b2c3',
      }),
    ).toBe(`Back Bay Coffee, Sat 7:30 am. ${SHARE_BASE_URL}/meets/back-bay-coffee-a1b2c3`);
  });

  it('leaves out the time for a meet with no dates announced', () => {
    expect(shareEventText({ title: 'Back Bay Coffee', when: null, slug: 'back-bay' })).toBe(
      `Back Bay Coffee. ${SHARE_BASE_URL}/meets/back-bay`,
    );
  });

  it('carries the token into the shared message too', () => {
    expect(
      shareEventText({ title: 'Secret', when: 'Sat 7:30 am', slug: 'secret', token: 'tok_9' }),
    ).toContain('?token=tok_9');
  });

  it('addresses an occurrence by its id', () => {
    expect(canonicalOccurrenceUrl('occ-1')).toBe(`${SHARE_BASE_URL}/occurrences/occ-1`);
  });
});

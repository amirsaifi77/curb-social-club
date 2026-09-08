import type { FeedSection } from '@curb/api-client';
import { describe, expect, it } from '@jest/globals';

import { SECTION_TITLES, renderableSections } from './sections';

import { clubSummary, eventSummary, sponsorSummary } from '@/components/fixtures';


function section(kind: string, items: unknown[]): FeedSection {
  return {
    kind,
    title: SECTION_TITLES[kind] ?? kind,
    items,
    more: { path: '/events', params: {} },
  } as FeedSection;
}

// docs/specs/discovery.md R-12, AC-11, AC-12; clubs R-17; sponsors R-16.
describe('renderableSections', () => {
  it('AC-11: keeps the API order and renders only the sections that came back', () => {
    const sections = renderableSections([
      section('this_weekend', [eventSummary()]),
      section('clubs_nearby', [clubSummary()]),
      section('later', [eventSummary({ id: 'later-1', slug: 'later-one' })]),
    ]);

    expect(sections.map((row) => row.kind)).toEqual(['this_weekend', 'clubs_nearby', 'later']);
    expect(sections.map((row) => row.title)).toEqual(['This weekend', 'Clubs near you', 'Later']);
  });

  it('AC-12: an empty response renders no sections at all', () => {
    expect(renderableSections([])).toEqual([]);
    expect(renderableSections(undefined)).toEqual([]);
  });

  it('R-12: never renders a titled group above nothing', () => {
    expect(renderableSections([section('this_weekend', [])])).toEqual([]);
  });

  it('renders the kinds Phase 1 cannot draw as nothing rather than an empty group', () => {
    const sections = renderableSections([
      section('following', [{ type: 'event' }]),
      section('recent_photos', [{ id: 'photo' }]),
      section('spots_nearby', [{ id: 'spot' }]),
      section('this_weekend', [eventSummary()]),
    ]);

    expect(sections.map((row) => row.kind)).toEqual(['this_weekend']);
  });

  it('sponsors R-16: the sponsors row is the same layout weight as the clubs row', () => {
    const sections = renderableSections([
      section('clubs_nearby', [clubSummary()]),
      section('sponsors_nearby', [sponsorSummary()]),
    ]);

    expect(sections[0].layout).toBe('clubs');
    expect(sections[1].layout).toBe('sponsors');
    expect(sections[1].title).toBe('Sponsors near you');
  });

  it('falls back to the API title for a kind the client has no copy for', () => {
    const sections = renderableSections([
      { ...section('this_weekend', [eventSummary()]), title: 'Server said this' },
    ]);
    // The client's copy wins where it has one, so the Copy table is the truth.
    expect(sections[0].title).toBe('This weekend');
  });
});

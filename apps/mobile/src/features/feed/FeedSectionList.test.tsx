// Registers the Unistyles themes before the cards' StyleSheet.create runs.
import '@/lib/unistyles';

import { describe, expect, it, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';

import { FeedSectionList } from './FeedSectionList';
import { renderableSections } from './sections';

import { clubSummary, eventSummary, sponsorSummary } from '@/components/fixtures';

function feed() {
  return [
    { kind: 'this_weekend', title: 'API weekend', items: [eventSummary()] },
    // A kind Phase 1 cannot draw, between two it can: order has to survive it.
    { kind: 'following', title: 'From people you follow', items: [eventSummary()] },
    { kind: 'clubs_nearby', title: 'API clubs', items: [clubSummary()] },
    // A name the event card's own sponsor logos do not also carry.
    { kind: 'sponsors_nearby', title: 'API sponsors', items: [sponsorSummary({ name: 'Harbor Tire' })] },
    { kind: 'later', title: 'API later', items: [] },
  ] as never;
}

// docs/specs/discovery.md AC-11, R-12; sponsors.md AC-16.
describe('FeedSectionList', () => {
  it('AC-11: renders only the drawable, non-empty sections, in API order', async () => {
    await render(
      <FeedSectionList
        sections={renderableSections(feed())}
        refreshing={false}
        onRefresh={jest.fn()}
      />,
    );

    // FlashList renders its items after a layout pass, so wait for the first.
    await screen.findByText('This weekend');
    const titles = screen.getAllByRole('header').map((node) => node.props.children);
    expect(titles).toEqual(['This weekend', 'Clubs near you', 'Sponsors near you']);

    // The undrawable kind renders as nothing, not as an empty titled group.
    expect(screen.queryByText('From people you follow')).toBeNull();
    // An empty section never becomes a title above nothing.
    expect(screen.queryByText('Later')).toBeNull();
  });

  it('AC-16: the sponsor row matches the club row and carries no label', async () => {
    await render(
      <FeedSectionList
        sections={renderableSections(feed())}
        refreshing={false}
        onRefresh={jest.fn()}
      />,
    );

    await screen.findByText('Clubs near you');
    const club = screen.getByLabelText('Back Bay Air-Cooled');
    const sponsor = screen.getByLabelText('Harbor Tire');
    expect(sponsor.props.style).toEqual(club.props.style);
    expect(screen.queryByText(/Sponsored/i)).toBeNull();
  });
});

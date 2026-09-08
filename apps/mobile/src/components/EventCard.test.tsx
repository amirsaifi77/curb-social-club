// Registers the Unistyles themes before the card's StyleSheet.create runs.
import '@/lib/unistyles';

import { describe, expect, it } from '@jest/globals';
import { render, screen } from '@testing-library/react-native';

import { EventCard } from './EventCard';
import { eventSummary } from './fixtures';

// docs/specs/discovery.md R-13 and AC-13.
describe('EventCard', () => {
  it('AC-13: renders the whole unclaimed, recurring, imported card', async () => {
    await render(<EventCard event={eventSummary()} />);

    expect(screen.getByText('Lido Saturday')).toBeTruthy();
    expect(screen.getByText('Every Saturday')).toBeTruthy();
    // The exact string from the events spec Copy table.
    expect(screen.getByText('Check. Last confirmed Jul 12.')).toBeTruthy();
    expect(screen.getByText('Instagram')).toBeTruthy();
    expect(screen.getByLabelText('Bear Coast Coffee')).toBeTruthy();
    expect(screen.getByLabelText('Apex Detail')).toBeTruthy();
    // The host chip, from the one Host shape.
    expect(screen.getByText('Back Bay Air-Cooled')).toBeTruthy();
    // Going is hidden at zero.
    expect(screen.queryByText('0 going')).toBeNull();
  });

  it('AC-13: a fresh unclaimed meet reads Unclaimed rather than Check', async () => {
    await render(<EventCard event={eventSummary({ stale: false })} />);

    expect(screen.getByText('Unclaimed. Last confirmed Jul 12.')).toBeTruthy();
    expect(screen.queryByText('Check. Last confirmed Jul 12.')).toBeNull();
  });

  it('R-13: a claimed meet carries no confirmation chip at all', async () => {
    await render(<EventCard event={eventSummary({ claimed: true, stale: false })} />);

    expect(screen.queryByText(/Last confirmed/)).toBeNull();
  });

  it('R-13: shows the day and time in the venue timezone, not the reader', async () => {
    await render(<EventCard event={eventSummary()} />);

    // 14:30 UTC on a Saturday in October is 7:30 am in Newport Beach.
    expect(screen.getByText('Sat, Oct 24, 7:30 am')).toBeTruthy();
  });

  it('R-13: shows the venue and the distance in miles', async () => {
    await render(<EventCard event={eventSummary()} />);

    expect(screen.getByText('Lido Marina Village · 3.0 mi')).toBeTruthy();
  });

  it('R-13: shows a going count above zero', async () => {
    const event = eventSummary();
    await render(
      <EventCard
        event={eventSummary({
          next_occurrence: { ...event.next_occurrence!, going_count: 42 },
        })}
      />,
    );

    expect(screen.getByText('42 going')).toBeTruthy();
  });

  it('R-13: caps the sponsor logos at two', async () => {
    const event = eventSummary();
    const third = { ...event.sponsors_preview[0], id: 'third', name: 'Third Sponsor' };
    await render(<EventCard event={eventSummary({ sponsors_preview: [...event.sponsors_preview, third] })} />);

    expect(screen.queryByLabelText('Third Sponsor')).toBeNull();
  });

  it('renders an announced meet with no next occurrence', async () => {
    await render(<EventCard event={eventSummary({ next_occurrence: null, cadence: 'announced' })} />);

    expect(screen.getByText('Dates announced by the host')).toBeTruthy();
  });
});

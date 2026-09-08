import type { EventSummary } from '@curb/api-client';
import { Link } from 'react-router';

import { dayAndTime } from '~/lib/format';

// The card W01, W02 and the city pages share. Flat: a solid fill and a
// hairline, no gradient and no shadow (brand-guide section 4).
export function MeetCard({ event }: { event: EventSummary }) {
  const next = event.next_occurrence;

  return (
    <article className="border border-border bg-surface">
      <Link to={`/meets/${event.slug}`} className="block p-4">
        <h3 className="font-display text-2xl leading-tight">{event.title}</h3>
        {next ? (
          <p className="mt-1 text-textSecondary">{dayAndTime(next.starts_at, next.timezone)}</p>
        ) : null}
        <p className="text-textSecondary">
          {[event.venue.name, event.venue.city].filter(Boolean).join(', ')}
        </p>
        {event.recurring && event.rrule_text ? (
          <p className="mt-1 text-sm text-textSecondary">{event.rrule_text}</p>
        ) : null}
      </Link>
    </article>
  );
}

// A feed section holds three kinds of item (EventSummary, ClubSummary,
// SponsorSummary). W01 renders the three time sections, whose items are
// always meets, so anything else is skipped rather than rendered blank.
export function isEventSummary(item: unknown): item is EventSummary {
  if (typeof item !== 'object' || item === null) return false;
  const candidate = item as Partial<EventSummary>;
  return (
    typeof candidate.slug === 'string' &&
    typeof candidate.title === 'string' &&
    typeof candidate.venue === 'object' &&
    candidate.venue !== null
  );
}

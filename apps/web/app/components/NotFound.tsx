import type { EventSummary } from '@curb/api-client';

import { MeetCard, isEventSummary } from './MeetCard';

import { WEB_COPY } from '~/lib/copy';

// web.md R-21 and the Copy table. A dead address is a page with somewhere
// to go next, not a stack trace: three meets near the reader, from the same
// feed the home page reads.
export const NEARBY_LIMIT = 3;

export interface NotFoundProps {
  /** 404 for an address nobody has, 410 for something that was retired. */
  status: 404 | 410;
  nearby: readonly unknown[];
}

export function NotFound({ status, nearby }: NotFoundProps) {
  const gone = status === 410;
  const meets: EventSummary[] = nearby.filter(isEventSummary).slice(0, NEARBY_LIMIT);

  return (
    <main className="mx-auto max-w-pageMax px-gutter py-16">
      <h1 className="font-display text-4xl">
        {gone ? WEB_COPY.goneHeadline : WEB_COPY.notFoundHeadline}
      </h1>
      {/* The 404 line ends in a colon and the 410 header stands alone, so
          the sentence only appears when there is a list under it. */}
      {meets.length > 0 ? (
        <p className="mt-2 text-textSecondary">
          {gone ? WEB_COPY.goneNearby : WEB_COPY.notFoundBody}
        </p>
      ) : null}

      {meets.length > 0 ? (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {meets.map((event) => (
            <li key={event.id}>
              <MeetCard event={event} />
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}

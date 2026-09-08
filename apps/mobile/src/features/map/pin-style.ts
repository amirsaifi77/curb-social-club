import type { MapPinInput } from '@curb/ui';

// brand/brand-guide.md section 4 pin roles, and gaps item 30: `now`,
// `today`, `upcoming`, `recurring` are drawn; `past` is not drawn on S03 at
// launch, so a pin that has finished is simply left off.
export type PinStyle = 'now' | 'today' | 'upcoming' | 'recurring';

// A MapPin carries `starts_at` but no end and no venue timezone, so "on
// now" is a window off the start and "today" is the reader's own day. For
// a map of meets near the reader those are the same day in all but the
// rarest case, and the alternative is a heavier pin payload.
export const NOW_WINDOW_MS = 3 * 60 * 60 * 1000;

export function pinStyle(pin: MapPinInput, now: Date = new Date()): PinStyle | null {
  const starts = new Date(pin.starts_at).getTime();
  if (Number.isNaN(starts)) return null;
  const current = now.getTime();

  if (starts + NOW_WINDOW_MS <= current) return null;
  if (starts <= current) return 'now';
  // A series is drawn as a series once it is past today: the fact that it
  // comes back every week is what distinguishes it from a one-off, and that
  // matters less than "it is today".
  if (isSameDay(new Date(starts), now)) return 'today';
  return pin.recurring ? 'recurring' : 'upcoming';
}

function isSameDay(left: Date, right: Date): boolean {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

// The token role each style reads from the theme (brand-guide.md section 4).
export const PIN_ROLE: Record<PinStyle, 'pinNow' | 'pinToday' | 'pinUpcoming' | 'pinRecurring'> = {
  now: 'pinNow',
  today: 'pinToday',
  upcoming: 'pinUpcoming',
  recurring: 'pinRecurring',
};

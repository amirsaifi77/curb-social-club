// event-detail-and-rsvp.md R-23: the canonical URL is the web one, so a
// shared link opens the page anyone can read and deep-links into the app
// where it is installed. Shared by web and mobile so one place decides what
// a meet's address is.
export const SHARE_BASE_URL = 'https://curbsocial.club';

export function canonicalEventUrl(slug: string, token?: string | null): string {
  const path = `${SHARE_BASE_URL}/meets/${encodeURIComponent(slug)}`;
  // R-23 and AC-17: an unlisted event is only readable with its token, so a
  // share that dropped it would send someone to a 404.
  return token ? `${path}?token=${encodeURIComponent(token)}` : path;
}

export function canonicalOccurrenceUrl(id: string): string {
  return `${SHARE_BASE_URL}/occurrences/${encodeURIComponent(id)}`;
}

// The Copy table's share message: "Back Bay Coffee, Sat 7:30 am. https://..."
export function shareEventText(input: {
  title: string;
  when: string | null;
  slug: string;
  token?: string | null;
}): string {
  const url = canonicalEventUrl(input.slug, input.token);
  return input.when ? `${input.title}, ${input.when}. ${url}` : `${input.title}. ${url}`;
}

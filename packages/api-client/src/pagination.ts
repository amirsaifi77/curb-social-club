// Cursor pagination per docs/api.md: ?limit=20&cursor=<opaque>, and a
// collection envelope { data: [...], meta: { next_cursor, total } } whose
// next_cursor is null on the last page. Helpers for useInfiniteQuery.
export interface Page<T> {
  data: T[];
  meta: { next_cursor: string | null; total?: number | null };
}

export type Cursor = string | undefined;

export const MAX_PAGE_LIMIT = 50;
export const DEFAULT_PAGE_LIMIT = 20;

// initialPageParam for useInfiniteQuery: the first page has no cursor.
export const firstPage: Cursor = undefined;

export function getNextPageParam<T>(lastPage: Page<T>): Cursor {
  return lastPage.meta.next_cursor ?? undefined;
}

// Query parameters for one page request.
export function pageParams(
  cursor: Cursor,
  limit = DEFAULT_PAGE_LIMIT,
): { limit: number; cursor?: string } {
  const bounded = Math.min(Math.max(1, Math.trunc(limit)), MAX_PAGE_LIMIT);
  return cursor ? { limit: bounded, cursor } : { limit: bounded };
}

// Flattens the pages TanStack keeps into one list for rendering.
export function pageItems<T>(pages: Page<T>[] | undefined): T[] {
  return pages?.flatMap((page) => page.data) ?? [];
}

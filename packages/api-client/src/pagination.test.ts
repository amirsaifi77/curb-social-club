import { describe, expect, it } from 'vitest';

import { firstPage, getNextPageParam, pageItems, pageParams, type Page } from './pagination';

describe('cursor pagination helpers', () => {
  const pages: Page<{ id: number }>[] = [
    { data: [{ id: 1 }, { id: 2 }], meta: { next_cursor: 'c2' } },
    { data: [{ id: 3 }], meta: { next_cursor: null, total: 3 } },
  ];

  it('maps next_cursor to the next page param and stops at null', () => {
    expect(firstPage).toBeUndefined();
    expect(getNextPageParam(pages[0]!)).toBe('c2');
    expect(getNextPageParam(pages[1]!)).toBeUndefined();
  });

  it('builds page params within the API limit', () => {
    expect(pageParams(undefined)).toEqual({ limit: 20 });
    expect(pageParams('c2', 10)).toEqual({ limit: 10, cursor: 'c2' });
    expect(pageParams(undefined, 500)).toEqual({ limit: 50 });
    expect(pageParams(undefined, 0)).toEqual({ limit: 1 });
  });

  it('flattens pages into items', () => {
    expect(pageItems(pages).map((item) => item.id)).toEqual([1, 2, 3]);
    expect(pageItems(undefined)).toEqual([]);
  });
});

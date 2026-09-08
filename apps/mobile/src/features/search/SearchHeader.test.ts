import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { router } from 'expo-router';

import { SEARCH_COPY } from './copy';
import { markSearchClosed, openSearch, SearchHeader } from './SearchHeader';

// docs/specs/discovery.md R-20: one native field, on Home and Map, opening
// S05 as a modal.
describe('the search field', () => {
  beforeEach(() => {
    markSearchClosed();
    jest.mocked(router.push).mockClear();
  });

  it('R-20: carries the placeholder from the Copy table', () => {
    expect(SearchHeader.headerSearchBarOptions.placeholder).toBe(SEARCH_COPY.placeholder);
  });

  it('R-20: opens S05 when the field takes focus', () => {
    SearchHeader.headerSearchBarOptions.onFocus();

    expect(router.push).toHaveBeenCalledWith('/search');
  });

  it('does not open a second S05 when focus returns to the field', () => {
    openSearch();
    // iOS restores first responder to the field as the modal dismisses.
    openSearch();

    expect(router.push).toHaveBeenCalledTimes(1);
  });

  it('opens again once S05 has gone', () => {
    openSearch();
    markSearchClosed();
    openSearch();

    expect(router.push).toHaveBeenCalledTimes(2);
  });
});

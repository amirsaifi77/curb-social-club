import { router } from 'expo-router';

import { SEARCH_COPY } from './copy';

// R-20: the search field is system chrome, so it comes from the native
// header rather than a view drawn over the screen. Both Home and Map carry
// the same one, and both open S05 as a modal (docs/screens.md S05).

// Focusing the native field is what opens S05, and iOS restores first
// responder to that field when the modal dismisses. Without this the
// restored focus would open S05 again, and again. The flag is cleared when
// S05 unmounts, so the next deliberate tap still opens it.
let opening = false;

export function openSearch(): void {
  if (opening) return;
  opening = true;
  router.push('/search');
}

export function markSearchClosed(): void {
  opening = false;
}

export const SearchHeader = {
  headerSearchBarOptions: {
    placeholder: SEARCH_COPY.placeholder,
    // The native field hands typing straight to S05 rather than filtering
    // in place: the groups, the recents and the actions all live there.
    onFocus: openSearch,
    hideWhenScrolling: false,
  },
} as const;

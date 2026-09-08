import { router } from 'expo-router';

import { SEARCH_COPY } from './copy';

// R-20: the search field is system chrome, so it comes from the native
// header rather than a view drawn over the screen. Both Home and Map carry
// the same one, and both open S05 as a modal (docs/screens.md S05).
export const SearchHeader = {
  headerSearchBarOptions: {
    placeholder: SEARCH_COPY.placeholder,
    // The native field hands typing straight to S05 rather than filtering
    // in place: the groups, the recents and the actions all live there.
    onFocus: () => router.push('/search'),
    hideWhenScrolling: false,
  },
} as const;

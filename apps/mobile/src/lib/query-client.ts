import { QueryClient } from '@tanstack/react-query';

import { MAX_AGE } from './persister';

// One cache for the app. Query keys and option factories live in
// @curb/api-client so web and mobile name resources the same way.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      // At least as long as the persister keeps a snapshot: a query that is
      // garbage collected first would have its saved results written away
      // before airplane mode could show them (R-14, AC-8).
      gcTime: MAX_AGE,
    },
  },
});

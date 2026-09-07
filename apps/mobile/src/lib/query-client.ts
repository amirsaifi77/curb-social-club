import { QueryClient } from '@tanstack/react-query';

// One cache for the app. Query keys and option factories live in
// @curb/api-client so web and mobile name resources the same way.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

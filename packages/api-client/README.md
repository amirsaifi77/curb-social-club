# @curb/api-client

Typed client for the Curb Social Club API, shared by web and mobile. `createClient`, `ApiError`, and `unwrap` shipped in session 0.6; session 0.9 moved the types to the `@curb/types` output and added the request functions, TanStack Query option factories, hooks, shared keys, and cursor helpers.

## Design

| Piece | Choice |
|---|---|
| Transport | `openapi-fetch` bound to the `paths` type from `@curb/types`, so every call is typed with zero runtime schema |
| Requests | `api.<resource>.<action>(client, ...)`: one typed function per operation, resolving the parsed body or throwing `ApiError`. Non-React callers (the mobile auth store, React Router loaders) use these directly |
| Queries | Option factories (`meQuery(client)`, `healthQuery(client)`) built with `queryOptions`, usable with `useQuery` and with `queryClient.ensureQueryData` in loaders; mutation factories (`signInWithAppleMutation`, `registerDeviceMutation`, ...) |
| Hooks | `useMe`, `useHealth`, `useSignInWithApple`, `useSignInWithGoogle`, `useSignOut`, `useUpdateMe`, `useDeleteAccount`, `useRegisterDevice`, `useUpdateDevice`; sign-in and profile writes update the `me` cache, sign-out and delete drop it. The client comes from `ApiClientProvider` (inside `QueryClientProvider`) |
| Keys | `queryKeys` and `mutationKeys` in `keys.ts`, shared so web and mobile name resources the same way |
| Auth | `createClient({ baseUrl, getToken, getDeviceId, onUnauthorized })`; the client injects `Authorization` and `X-Device-Id` per request and calls `onUnauthorized` on any 401. Callers own storage (Keychain on mobile, cookie on web SSR) |
| Errors | Normalizes the API error envelope into an `ApiError` class with `code`, `status`, `details`; a 4xx never retries |
| Pagination | `firstPage`, `getNextPageParam`, `pageParams`, `pageItems` for `useInfiniteQuery` over `{ data, meta.next_cursor }` envelopes |
| Contract | `endpoints.ts` names every operation the client wraps; `contract.test.ts` checks each against the committed `generated.d.ts`, and `checkedEndpoints` makes the same check at compile time |

## Layout

```
packages/api-client/
  src/
    client.ts        # createClient, ApiError, unwrap
    requests.ts      # api.health, api.auth, api.me, api.devices
    keys.ts          # queryKeys, mutationKeys
    queries.ts       # queryOptions and mutation factories
    hooks.ts         # useMe, useSignInWithApple, ...
    provider.ts      # ApiClientProvider, useApiClient
    pagination.ts    # cursor helpers
    endpoints.ts     # the operation map the contract test reads
    *.test.ts        # vitest: client, queries, pagination, contract
    index.ts
  package.json       # peer deps: react, @tanstack/react-query
  tsconfig.json      # extends @curb/config/tsconfig.base.json
```

## Rules

Regenerate `@curb/types` before adding a request function or hook for a new endpoint, then add the operation to `endpoints.ts` (the contract test fails until every declared path has a wrapper). No app-specific UI state in this package.

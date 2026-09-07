# @curb/api-client

Typed client for the Curb Social Club API, shared by web and mobile. `createClient`, `ApiError`, and `unwrap` shipped in session 0.6 over a hand-written `src/paths.ts` for the Phase 0 endpoints; session 0.9 replaces those types with the `@curb/types` output and adds the TanStack Query hooks.

## Design

| Piece | Choice |
|---|---|
| Transport | `openapi-fetch` bound to the `paths` type from `@curb/types`, so every call is typed with zero runtime schema |
| Hooks | TanStack Query v5 hooks (`useNearbyEvents`, `useEvent`, `useOccurrence`, `useFeed`, `useImport` with polling, `useRsvp` mutation, ...) |
| Auth | `createClient({ baseUrl, getToken, getDeviceId })`; the client injects `Authorization` and `X-Device-Id` per request. Callers own storage (Keychain on mobile, cookie on web SSR). |
| Errors | Normalizes the API error envelope into an `ApiError` class with `code`, `status`, `details` |
| Pagination | `useInfiniteQuery` helpers keyed on `next_cursor` |
| SSR | Raw client is usable in React Router loaders; hooks are client-side only |

## Layout

```
packages/api-client/
  src/
    client.ts        # createClient, ApiError
    hooks/           # one file per resource
    keys.ts          # query key factory
    index.ts
  package.json       # peer deps: react, @tanstack/react-query
  tsconfig.json      # extends @curb/config/tsconfig.base.json
```

## Rules

Regenerate `@curb/types` before adding a hook for a new endpoint. No app-specific UI state in this package.

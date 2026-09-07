# @curb/types

TypeScript types generated from the Rails API's OpenAPI spec. Do not hand edit `src/generated.d.ts`.

## Flow

```
apps/api rswag request specs
  -> pnpm --filter @curb/api openapi      (bundle exec rake rswag:specs:swaggerize)
  -> apps/api/swagger/v1/openapi.yaml    (committed)
  -> pnpm --filter @curb/types generate   (openapi-typescript openapi.yaml -o src/generated.d.ts)
  -> src/index.ts re-exports paths, components, and friendly aliases
```

Turborepo's `generate` task depends on `^openapi`, so `pnpm generate` at the root runs both in order. CI fails if the committed output is stale.

## Layout

```
packages/types/
  src/
    generated.d.ts   # output, committed (prettier and eslint ignore it)
    index.ts         # paths, components, schema aliases (User, Profile, Device, ApiErrorBody),
                     # JsonRequest<path, method> and JsonResponse<path, method, status>,
                     # and named bodies (SignInResponse, MeResponse, RegisterDeviceBody, ...)
    index.test.ts    # every Phase 0 path is present; alias shapes checked by tsc
  package.json       # devDependency: openapi-typescript
  tsconfig.json
```

Add an alias in `src/index.ts` when an endpoint gains a consumer; `@curb/api-client` builds its request functions on them.

## Why commit the generated file

Web and mobile CI jobs do not install Ruby. Committing the output keeps them fast and makes API changes visible in PR diffs.

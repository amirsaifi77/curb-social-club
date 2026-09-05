# @cac/ui

Shared logic and headless components for web and mobile. Not implemented yet.

## Scope (deliberately narrow)

Truly shared code is logic, not pixels. iOS renders native Liquid Glass components; web renders HTML. Sharing rendering through react-native-web was considered and rejected at launch (weight, SSR friction, fights the native look). If overlap grows, `react-strict-dom` is the path to revisit.

| Shared | Examples |
|---|---|
| Map logic | `supercluster` wrapper, bbox helpers, pin payload to cluster conversion |
| Formatting | `formatOccurrence` (local time with timezone), `describeRrule` ("Every Saturday, 7 to 10am"), distance formatting (mi with one decimal) |
| Links | canonical event URL and share text builders, deep link parsing |
| Headless hooks | `useRsvpState`, `useImportPolling`, `useDraftForm` (state and validation, no JSX) |
| Validation | zod schemas for event and vehicle forms, matching API rules |

Not shared: buttons, cards, tab bars, glass surfaces, anything with platform-specific rendering.

## Layout

```
packages/ui/
  src/
    map/
    format/
    links/
    hooks/
    schemas/
    index.ts
  package.json     # deps: supercluster, date-fns, date-fns-tz, rrule (or a small describer), zod
  tsconfig.json
```

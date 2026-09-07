# @curb/ui

Shared logic and headless components for web and mobile. Session 0.10 shipped the first piece: `useAsyncAction`, the primary CTA state machine (`hooks/`); the rest lands with its features.

## Scope (deliberately narrow)

Truly shared code is logic, not pixels. iOS renders native Liquid Glass components; web renders HTML. Sharing rendering through react-native-web was considered and rejected at launch (weight, SSR friction, fights the native look). If overlap grows, `react-strict-dom` is the path to revisit.

| Shared | Examples |
|---|---|
| Map logic | `supercluster` wrapper, bbox helpers, pin payload to cluster conversion |
| Formatting | `formatOccurrence` (local time with timezone), `describeRrule` ("Every Saturday, 7 to 10am"), distance formatting (mi with one decimal) |
| Links | canonical event URL and share text builders, deep link parsing |
| Headless hooks | `useAsyncAction` (the primary CTA machine over `motion.asyncButton`: no loading under 150 ms, loading kept 400 ms, confirmed held 600 ms, error at 10 s with silent late success), `useRsvpState`, `useImportPolling`, `useDraftForm` (state and validation, no JSX) |
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
      asyncActionMachine.ts   # createAsyncActionMachine: React-free, tested with fake timers
      useAsyncAction.ts       # the hook: { status, run, error, stillWorking, reset }
    schemas/
    index.ts
  package.json     # deps: @curb/design-tokens (motion); peer: react; later supercluster, date-fns, date-fns-tz, rrule, zod
  tsconfig.json
```

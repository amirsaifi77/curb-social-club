# Development fixture rows

Fabricated data so the app has something on screen before any real meet has
been verified. `bin/rails seeds:dev` renders these templates and imports them
through the same importers `seeds:all` uses (`docs/local-development.md`).

## These are not seed data

`db/seeds/` holds verified rows: an events row lands there only after somebody
checked the meet against the organizer's own post on `verified_date` (events
spec R-30). Nothing here has been checked, because none of it exists.

| Signal | Why |
|---|---|
| Every event, club, and sponsor slug starts `dev-`; every handle starts `dev_` | The rows a person reads are labelled where they are named |
| Every name is invented | No real club, shop, or meet is named here |
| `verification_source_url` is `https://example.invalid/...` | `.invalid` can never resolve (RFC 2606), so a fixture row can never be mistaken for a checked one |
| Social handles are blank | A plausible handle would point at a real person's account |
| Venue coordinates are real, rounded to two decimals | Enough for the map and `near` to behave; not a claim that anything happens there |

### What the slug prefix does not cover

`LIKE 'dev-%'` is not a way to find every fixture row, for two reasons.

`_` is a `LIKE` wildcard, so the pattern would not match the `dev_` handles
even if they were in the same column, and four tables carry no marker at all:
`venues`, `event_occurrences`, `club_memberships`, and `event_sponsorships`.
They are reachable only through the rows that do carry one.

`venues` is the one to watch. It has no slug and no fabrication flag, and the
fixture lots carry plausible street addresses. `Venues::Deduper` matches on a
normalized name within 100 m (events spec R-6), so once verified rows exist, a
real row naming the same lot in the same development database would attach to
the fixture venue and take its address. `bin/rails seeds:dev:clear` is the way
out: it removes every fixture row, including venues nothing else still uses.

`Seeds::Runner.import_all` reads `db/seeds`, not this directory, so
`db/seeds.rb` never loads these rows. `seeds:dev` refuses to run in
production.

## Dates

`events.csv.erb` is a template rather than a CSV because the rows have to stay
current. `verified_date` renders as today, so a fixture meet is never stale
(R-25) or dormant (R-26) on the day it is imported; recurring `dtstart` values
render in the past and materialize forward, and the one `once` meet renders in
the future. Re-run `seeds:dev` to move the dates on; rows upsert on their
slug.

## Files

| File | Rows |
|---|---|
| `sponsors.csv.erb` | Two sponsors, one verified, covering `vendor` and `brand` |
| `clubs.csv.erb` | Two clubs, one open and verified, one invite-only |
| `events.csv.erb` | Seven meets, one per launch city, covering every cadence except `announced`, all three host types plus the app account, and two sponsorships |
| `images/` | Fifteen placeholder pictures: a cover per event, an avatar and banner per club, a logo and banner per sponsor |

## Images

The rows carry pictures so the cards and host pages render their photo-first
layout instead of the empty one. Every file under `images/` is a flat
composition in the brand palette (a serif title, the place and the time, a
hairline lot) that says on its face that it is a placeholder, because the
lots do not exist and nothing photographed should stand in for them.

| Rule | Detail |
|---|---|
| One file per attachment | `images/<table>/<slug>-<attachment>.jpg`: `events/*-cover.jpg`, `clubs/*-avatar.jpg` and `*-banner.jpg`, `sponsors/*-logo.jpg` and `*-banner.jpg` |
| Sizes | Covers and banners 1200 by 675 (16:9, the card and detail ratio). Avatars and logos 512 by 512 |
| Attached by `seeds:dev` | After the rows import, each attachment that is empty gets its file. A re-run attaches nothing, so the blobs are not duplicated |
| A row without a picture | Reported (`no cover for dev-x at images/events/dev-x-cover.jpg, skipping`) and left bare. Adding a fixture row never waits on drawing one |
| Removed by `seeds:dev:clear` | Purged inline before the rows go, so the files leave `storage/` even when no Solid Queue worker is running |
| Drawn by | `node tooling/render-fixture-images.mjs`, which screenshots a small HTML page per image with the Chromium `apps/web` already depends on. Re-run it when a fixture row is added or renamed and commit the output |

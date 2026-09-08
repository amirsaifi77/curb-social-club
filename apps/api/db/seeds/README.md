# Seed CSVs

The importers in `app/services/seeds` read these files; `bin/rails
seeds:import[db/seeds/events.csv]` runs one, `bin/rails seeds:all` runs all
four in order, and `db/seeds.rb` runs any that carry rows. Column rules are
in `docs/specs/events-and-occurrences.md` (events) and `docs/specs/admin.md`
(venues, clubs, sponsors).

Import order is venues (optional; event rows carry their venue columns),
sponsors, clubs, events. An event row naming a club or sponsor slug that
does not exist yet is a row error, not a silent skip.

Every event row needs `verification_source_url` and `verified_date` (events
spec R-30). A row is written only after somebody has checked the meet
against the organizer's own post or page on that date. The files here carry
their headers and no rows: `docs/research/market-research.md` section 4 is a
starting list to verify against, not seed data, and it carries no
coordinates. Rows land as they are verified.

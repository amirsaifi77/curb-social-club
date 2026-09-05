# ADR 0003: PostGIS geography with materialized occurrences

Date: 2026-09-05. Status: Accepted.

## Context

Core queries are "meets near me this weekend" (radius), "meets in this map viewport" (bounding box), and "next dates for this recurring meet". Recurring meets are the norm (every Saturday morning). The map needs clustering at low zoom.

## Decision

Postgres 16 with PostGIS 3.4. All points stored as `geography(Point, 4326)`. Queries use `ST_DWithin` for radius and `ST_Intersects` with `ST_MakeEnvelope` for viewport, both indexed with GiST.

Recurring events store an RFC 5545 `rrule` and are expanded by a Solid Queue job using `ice_cube` into `event_occurrences` rows 8 weeks ahead. Occurrences denormalize `location` and `starts_at` so one composite GiST index (`btree_gist`) serves space plus time filters.

Clustering is client-side with `supercluster` in both apps; the map endpoint returns up to 500 slim pins for the viewport and flags truncation. Server-side `ST_ClusterDBSCAN` is a documented upgrade, not built now.

Adapter: `activerecord-postgis-adapter` 11.x with `rgeo`. Use `structure.sql` instead of `schema.rb` so PostGIS types and indexes round-trip.

## Alternatives

| Option | Why not |
|---|---|
| Geometry type with a projected SRID | Meter-accurate distances would need a local projection; SoCal launch is regional but the app is not. Geography handles this without per-region tuning. |
| Expand RRULE at query time | Cannot index, every nearby query becomes a scan across all recurring events. |
| Store occurrences forever ahead | Unbounded rows; 8 weeks covers the feed and reminders; horizon extends nightly. |
| Server-side clustering from day one | More code, round trip per zoom change, and unnecessary below tens of thousands of points. |
| H3 or geohash buckets | Useful for aggregation later; PostGIS indexes are sufficient and simpler for point queries. |
| `seuros/activerecord-postgis` | Cleaner architecture (extends the stock Postgres adapter) but early stage as of late 2025. Revisit when it stabilizes; migration cost is low since models use the same rgeo types. |

## Consequences

Positive: standard SQL, well understood indexes, and PostGIS is available on Render and Fly managed Postgres.

Negative: materialization is another moving part; a missed nightly run means the horizon shrinks. Mitigation: the job is idempotent and also triggered on read if the latest occurrence is under 6 weeks out. Denormalized location must be updated when a venue moves (rare; handled in the venue update path).

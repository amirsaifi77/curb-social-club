# ADR 0010: Polymorphic event hosts, clubs, and sponsors

Date: 2026-09-06. Status: Accepted.

## Context

The first data model made a user the only possible host of an event (`events.host_id` referencing `users`). The app overview already described organizer pages for "an organization or person", and the product now needs two more host-like entities: clubs (a group of members that organizes meets, optional to join, invite-only or open) and sponsors (a brand, vendor, or venue business that hosts or backs a meet and has its own page, managed off the app). Every host type must be followable, must be able to own one-off and recurring events, and must appear as the host on cards and detail screens. Retrofitting a host type onto `events` after the seed data and the API client exist would touch every event query, serializer, and screen.

At the same time, the launch scope must stay small: the builder has 10 to 15 hours per week and the launch target is the first half of 2027.

## Decision

`events` gets a polymorphic host: `host_type` in `User`, `Club`, `Sponsor` plus `host_id`. This ships in the first Phase 1 migration. `follows` accepts `User`, `Club`, `Sponsor`, and `Event` as followable types. Serializers expose one `host` shape with a `type` discriminator so cards and detail screens render any host the same way. Every event also records `created_by_id` (the user who created the row; the app account for seeds).

Clubs and sponsors are first-class tables from Phase 1, with detail pages on mobile and web, and are seeded and edited through an admin-only Rails UI at launch. Club membership (join, invite-only, roles) and club management in the app and on the web are specified now and built after launch. Sponsor management stays admin-only until a sponsor asks for self-service.

Sponsors can also be attached to an event as a component through `event_sponsorships` (role: presented by, coffee, vendor, partner) independent of who hosts it.

Sponsor and vendor are one entity, `Sponsor`, with a `kind` of `brand`, `vendor`, or `venue`. The UI label follows the kind.

Host claims stay manual review. A claim names the entity the claimant wants set as host (their own user or a club they administer).

## Alternatives

| Option | Why not |
|---|---|
| Keep users as the only host and model clubs as a profile flag | Clubs and sponsors have members, roles, and management surfaces that users do not. A flag becomes a type check in every screen. |
| A single `hosts` table with a `kind` column, and users, clubs, and sponsors point at it | Cleaner joins, but every user needs a host row and the identity model doubles. Polymorphic `belongs_to` is idiomatic Rails and the three types share little beyond name, avatar, and links. |
| Separate `vendor` and `sponsor` tables | The product uses the words interchangeably and the pages are identical. A `kind` column is enough until they diverge. |
| Build full club membership before launch | Adds four to six weeks at the current cadence for a feature no one has asked for yet. Read-only pages prove the concept with seeded clubs. |

## Consequences

Positive: one host shape across the API and clients from day one; clubs and sponsors ship as pages without new event queries; follow is one table for everything; adding a host type later is a migration and a serializer branch, not a rewrite.

Negative: polymorphic foreign keys have no database-level referential integrity; model validations and a nightly consistency check cover it. Search across host names needs a union or a denormalized `host_name` on events (the latter is chosen: `events.host_name` is written on save). Admin CRUD for clubs and sponsors is required in Phase 1, which pulls the admin UI forward.

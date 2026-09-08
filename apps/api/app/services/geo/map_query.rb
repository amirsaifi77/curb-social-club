module Geo
  # GET /events/map (R-21; discovery R-7): one MapPin per event from its
  # earliest scheduled occurrence in the window inside the box, the soonest
  # 500 by starts_at, with truncated set when the box held more.
  class MapQuery
    MAX_PINS = 500

    Result = Data.define(:pins, :truncated)

    attr_reader :bbox, :window, :filters

    def initialize(bbox:, window:, filters:)
      @bbox = bbox
      @window = window
      @filters = filters
    end

    def call
      rows = EventOccurrence.unscoped.from(inner_relation, :pins)
                            .order(Arel.sql("pins.starts_at ASC, pins.id ASC")).limit(MAX_PINS + 1)
                            .pluck(*%w[id event_id slug lat lng starts_at title going_count recurring].map { |column| Arel.sql("pins.#{column}") })
      pins = rows.first(MAX_PINS).map { |row| MapPin.new(*row) }
      Result.new(pins: pins, truncated: rows.size > MAX_PINS)
    end

    private

    def inner_relation
      relation = EventOccurrence.scheduled.joins(event: :venue).merge(Event.listed)
                                .where(starts_at: window.range)
                                .where("ST_Intersects(event_occurrences.location, ST_MakeEnvelope(?, ?, ?, ?, 4326)::geography)",
                                       bbox.west, bbox.south, bbox.east, bbox.north)
                                .select(Arel.sql(<<~SQL.squish))
                                  DISTINCT ON (event_occurrences.event_id)
                                  event_occurrences.id AS id,
                                  event_occurrences.event_id AS event_id,
                                  events.slug AS slug,
                                  ST_Y(event_occurrences.location::geometry) AS lat,
                                  ST_X(event_occurrences.location::geometry) AS lng,
                                  event_occurrences.starts_at AS starts_at,
                                  events.title AS title,
                                  event_occurrences.going_count AS going_count,
                                  (events.cadence <> 'once') AS recurring
                                SQL
                                .order(Arel.sql("event_occurrences.event_id, event_occurrences.starts_at"))
      filters.apply(relation)
    end
  end
end

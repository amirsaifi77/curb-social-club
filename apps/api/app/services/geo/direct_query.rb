module Geo
  # GET /events without near or bbox (R-18; discovery R-9): host pages,
  # sponsor pages, and search everywhere. Queries events directly with a
  # lateral join to the next scheduled occurrence, includes announced
  # events with a null next_occurrence, and orders nulls last.
  class DirectQuery < ListQuery
    CURSOR_SIZE = 2
    INFINITY = "infinity"

    attr_reader :past

    def initialize(past: false, **rest)
      super(**rest)
      @past = past
    end

    private

    def model = Event
    def sort_name = past ? "past" : "next"
    def columns = %w[event_id occurrence_id starts_at stale]

    def inner_relation
      relation = Event.listed.joins(:venue).joins(next_occurrence_join).select(Arel.sql(select_sql))
      # R-18: only an announced event may carry a null next_occurrence. An
      # event whose dates have all passed belongs in the past list, not at
      # the end of the upcoming one.
      relation = relation.where("next_occurrence.id IS NOT NULL OR events.cadence = 'announced'") unless past
      filters.apply(relation)
    end

    # Upcoming: the soonest scheduled date in the window, or none, which
    # keeps announced events in the list. Past: the most recent date
    # before now, and an event without one drops out.
    def next_occurrence_join
      return past_occurrence_join if past

      bounds = [ "o.starts_at >= :from" ]
      bounds << "o.starts_at <= :to" if window.to
      Event.sanitize_sql_array([ <<~SQL.squish, from: window.from, to: window.to ])
        LEFT JOIN LATERAL (
          SELECT o.id, o.starts_at FROM event_occurrences o
          WHERE o.event_id = events.id AND o.status = 'scheduled' AND #{bounds.join(' AND ')}
          ORDER BY o.starts_at LIMIT 1
        ) next_occurrence ON TRUE
      SQL
    end

    def past_occurrence_join
      Event.sanitize_sql_array([ <<~SQL.squish, from: window.from ])
        JOIN LATERAL (
          SELECT o.id, o.starts_at FROM event_occurrences o
          WHERE o.event_id = events.id AND o.starts_at < :from AND o.status <> 'cancelled'
          ORDER BY o.starts_at DESC LIMIT 1
        ) next_occurrence ON TRUE
      SQL
    end

    def select_sql
      <<~SQL.squish
        events.id AS event_id,
        next_occurrence.id AS occurrence_id,
        next_occurrence.starts_at AS starts_at,
        #{Event.stale_sql} AS stale
      SQL
    end

    def order_sql
      # Both columns descend so the keyset below can page dates that tie.
      return "hits.starts_at DESC, hits.event_id DESC" if past

      "COALESCE(hits.starts_at, 'infinity'::timestamptz) ASC, hits.event_id ASC"
    end

    def keyset_sql
      return "(hits.starts_at, hits.event_id) < (?::timestamptz, ?::uuid)" if past

      "(COALESCE(hits.starts_at, 'infinity'::timestamptz), hits.event_id) > (?::timestamptz, ?::uuid)"
    end

    def cursor_size = CURSOR_SIZE

    # row: [event_id, occurrence_id, starts_at, stale]
    def cursor_values(row)
      [ row[2] ? row[2].utc.iso8601(6) : INFINITY, row[0] ]
    end

    def cast_cursor(values)
      starts_at, id = values
      [ starts_at == INFINITY ? INFINITY : time!(starts_at), uuid!(id) ]
    end

    def distance_from(_row) = nil
    def stale_from(row) = row[3] == true
  end
end

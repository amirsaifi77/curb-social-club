module Geo
  # The geo path of GET /events (R-16, R-17, R-19, R-20): one row per event
  # from its earliest scheduled occurrence in the window, restricted by a
  # spatial predicate the subclass supplies, ordered by date (local day,
  # fresh first, then time, then distance) or by distance when `near` is
  # present. Distance is ST_Distance in PostGIS, never Ruby (R-23).
  class OccurrenceQuery < ListQuery
    SORTS = %w[date distance].freeze
    DATE_CURSOR_SIZE = 5
    DISTANCE_CURSOR_SIZE = 3

    attr_reader :origin, :sort, :local_days

    def initialize(window:, filters:, origin: nil, sort: "date", now: Time.current, local_days: nil, **rest)
      super(window: window, filters: filters, **rest)
      @origin = origin
      @local_days = local_days
      @sort = SORTS.include?(sort.to_s) ? sort.to_s : "date"
      @now = now
      raise ParamError, "Send near to sort by distance." if @sort == "distance" && origin.nil?
    end

    private

    attr_reader :now

    def model = EventOccurrence
    def sort_name = sort
    def columns = %w[event_id occurrence_id starts_at local_day stale distance_m]

    def inner_relation
      relation = EventOccurrence.scheduled.joins(event: :venue).merge(Event.listed)
                                .where(starts_at: window.range)
                                .where(spatial_sql, *spatial_binds)
      relation = relation.where("#{LOCAL_DAY_SQL} BETWEEN ? AND ?", local_days.first, local_days.last) if local_days
      relation = relation
                                .select(Arel.sql(select_sql))
                                .order(Arel.sql("event_occurrences.event_id, event_occurrences.starts_at"))
      filters.apply(relation)
    end

    # The occurrence's calendar day where the meet happens, not where the
    # server is.
    LOCAL_DAY_SQL = "(event_occurrences.starts_at AT TIME ZONE events.timezone)::date".freeze

    def select_sql
      <<~SQL.squish
        DISTINCT ON (event_occurrences.event_id)
        event_occurrences.event_id AS event_id,
        event_occurrences.id AS occurrence_id,
        event_occurrences.starts_at AS starts_at,
        #{LOCAL_DAY_SQL} AS local_day,
        #{Event.stale_sql(now)} AS stale,
        #{distance_sql} AS distance_m
      SQL
    end

    def distance_sql
      return "NULL::integer" if origin.nil?

      "ST_Distance(event_occurrences.location, #{origin_sql})::integer"
    end

    def origin_sql
      Geo.point_sql(origin.lat, origin.lng)
    end

    def order_sql
      if sort == "distance"
        "hits.distance_m ASC, hits.starts_at ASC, hits.event_id ASC"
      else
        "hits.local_day ASC, hits.stale ASC, hits.starts_at ASC, COALESCE(hits.distance_m, 0) ASC, hits.event_id ASC"
      end
    end

    def keyset_sql
      if sort == "distance"
        "(hits.distance_m, hits.starts_at, hits.event_id) > (?::integer, ?::timestamptz, ?::uuid)"
      else
        "(hits.local_day, hits.stale, hits.starts_at, COALESCE(hits.distance_m, 0), hits.event_id) > (?::date, ?::boolean, ?::timestamptz, ?::integer, ?::uuid)"
      end
    end

    def cursor_size
      sort == "distance" ? DISTANCE_CURSOR_SIZE : DATE_CURSOR_SIZE
    end

    # row: [event_id, occurrence_id, starts_at, local_day, stale, distance_m]
    def cursor_values(row)
      if sort == "distance"
        [ row[5].to_i, row[2].utc.iso8601(6), row[0] ]
      else
        [ row[3].iso8601, row[4] == true, row[2].utc.iso8601(6), row[5].to_i, row[0] ]
      end
    end

    def cast_cursor(values)
      if sort == "distance"
        distance, starts_at, id = values
        [ Integer(distance), time!(starts_at), uuid!(id) ]
      else
        day, stale, starts_at, distance, id = values
        [ Date.iso8601(day.to_s), stale == true, time!(starts_at), Integer(distance), uuid!(id) ]
      end
    rescue ArgumentError, TypeError, Date::Error
      raise ParamError, Cursor::INVALID
    end

    def distance_from(row) = row[5]
    def stale_from(row) = row[4] == true
  end
end

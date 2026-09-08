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
    SECTION_CURSOR_SIZE = 3

    # The occurrence's calendar day where the meet happens, not where the
    # server is. "Today" and "the coming Sunday" are read the same way, per
    # row, so a reader at 19:00 in Newport is not handed Saturday meets in a
    # "Next week" section because the server clock has already rolled over
    # to UTC tomorrow (discovery R-6).
    LOCAL_DAY_SQL = "(event_occurrences.starts_at AT TIME ZONE events.timezone)::date".freeze
    # Bound as an ISO 8601 string with an offset and cast explicitly, so the
    # answer does not depend on the session TimeZone or on how Postgres
    # resolves an untyped literal.
    LOCAL_TODAY_SQL = "(:now::timestamptz AT TIME ZONE events.timezone)::date".freeze
    # The coming Sunday in the venue's timezone, or today when today is Sunday.
    LOCAL_WEEKEND_END_SQL =
      "(#{LOCAL_TODAY_SQL} + ((7 - EXTRACT(DOW FROM #{LOCAL_TODAY_SQL})::integer) % 7))".freeze
    SECTION_SQL = {
      this_weekend: "#{LOCAL_DAY_SQL} BETWEEN #{LOCAL_TODAY_SQL} AND #{LOCAL_WEEKEND_END_SQL}",
      next_week: "#{LOCAL_DAY_SQL} BETWEEN #{LOCAL_WEEKEND_END_SQL} + 1 AND #{LOCAL_WEEKEND_END_SQL} + 7",
      later: "#{LOCAL_DAY_SQL} > #{LOCAL_WEEKEND_END_SQL} + 7"
    }.freeze

    attr_reader :origin, :sort, :section

    # `section` is internal to the feed (discovery R-6). It is not a query
    # parameter, so a caller cannot reach these orderings from the wire.
    def initialize(window:, filters:, origin: nil, sort: "date", now: Time.current, section: nil, **rest)
      super(window: window, filters: filters, **rest)
      @origin = origin
      @section = section&.to_sym
      @sort = SORTS.include?(sort.to_s) ? sort.to_s : "date"
      @now = now
      raise ArgumentError, "Unknown feed section #{section}." if @section && !SECTION_SQL.key?(@section)
      raise ParamError, "Send near to sort by distance." if @sort == "distance" && origin.nil?
    end

    private

    attr_reader :now

    def model = EventOccurrence
    # Cursors are namespaced by ordering, so one cannot be replayed against
    # another. The feed never pages a section, so its cursor branches exist
    # to keep the ordering, the keyset, and the cursor shape in one place
    # rather than because anything decodes one today.
    def sort_name = section ? "section:#{section}" : sort
    def columns = %w[event_id occurrence_id starts_at local_day stale distance_m]

    def inner_relation
      relation = EventOccurrence.scheduled.joins(event: :venue).merge(Event.listed)
                                .where(starts_at: window.range)
                                .where(spatial_sql, *spatial_binds)
      relation = relation.where(SECTION_SQL.fetch(section), now: now.utc.iso8601) if section
      relation = relation
                                .select(Arel.sql(select_sql))
                                .order(Arel.sql("event_occurrences.event_id, event_occurrences.starts_at"))
      filters.apply(relation)
    end

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

    # A feed section is soonest first then nearest (R-6); it has no `stale`
    # term, because a section is already one narrow slice of the calendar.
    def order_sql
      case ordering
      when :section then "hits.starts_at ASC, COALESCE(hits.distance_m, 0) ASC, hits.event_id ASC"
      when :distance then "hits.distance_m ASC, hits.starts_at ASC, hits.event_id ASC"
      else "hits.local_day ASC, hits.stale ASC, hits.starts_at ASC, COALESCE(hits.distance_m, 0) ASC, hits.event_id ASC"
      end
    end

    def keyset_sql
      case ordering
      when :section then "(hits.starts_at, COALESCE(hits.distance_m, 0), hits.event_id) > (?::timestamptz, ?::integer, ?::uuid)"
      when :distance then "(hits.distance_m, hits.starts_at, hits.event_id) > (?::integer, ?::timestamptz, ?::uuid)"
      else "(hits.local_day, hits.stale, hits.starts_at, COALESCE(hits.distance_m, 0), hits.event_id) > (?::date, ?::boolean, ?::timestamptz, ?::integer, ?::uuid)"
      end
    end

    def ordering
      return :section if section

      sort == "distance" ? :distance : :date
    end

    def cursor_size
      case ordering
      when :section then SECTION_CURSOR_SIZE
      when :distance then DISTANCE_CURSOR_SIZE
      else DATE_CURSOR_SIZE
      end
    end

    # row: [event_id, occurrence_id, starts_at, local_day, stale, distance_m]
    def cursor_values(row)
      case ordering
      when :section then [ row[2].utc.iso8601(6), row[5].to_i, row[0] ]
      when :distance then [ row[5].to_i, row[2].utc.iso8601(6), row[0] ]
      else [ row[3].iso8601, row[4] == true, row[2].utc.iso8601(6), row[5].to_i, row[0] ]
      end
    end

    def cast_cursor(values)
      case ordering
      when :section
        starts_at, distance, id = values
        [ time!(starts_at), Integer(distance), uuid!(id) ]
      when :distance
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

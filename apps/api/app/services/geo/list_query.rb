module Geo
  # Shared shape of the three GET /events queries: a keyset-paginated page
  # of EventHit rows built from an inner SQL that yields one row per event.
  # Subclasses supply the inner relation, the ordering, and the cursor
  # tuple; this class runs it, pages it, and loads the rows into hits.
  class ListQuery
    DEFAULT_LIMIT = 20
    MAX_LIMIT = 50

    attr_reader :window, :filters, :limit, :cursor

    def initialize(window:, filters:, limit: DEFAULT_LIMIT, cursor: nil)
      @window = window
      @filters = filters
      @limit = limit.to_i.clamp(1, MAX_LIMIT)
      @cursor = cursor.presence
    end

    def call
      rows = outer_relation.pluck(*columns.map { |column| Arel.sql("hits.#{column}") })
      more = rows.size > limit
      rows = rows.first(limit)
      Page.new(items: build_hits(rows), next_cursor: more ? Cursor.encode(sort_name, cursor_values(rows.last)) : nil)
    end

    # The inner relation without paging, for EXPLAIN in specs.
    def inner_sql
      inner_relation.to_sql
    end

    private

    def outer_relation
      relation = model.unscoped.from(inner_relation, :hits)
      relation = relation.where(keyset_sql, *decoded_cursor) if cursor
      relation.order(Arel.sql(order_sql)).limit(limit + 1)
    end

    def decoded_cursor
      values = Cursor.decode(cursor, sort: sort_name, size: cursor_size)
      cast_cursor(values)
    end

    # Loads events with everything the summary renders in a fixed number of
    # queries, then pairs them with their occurrence in row order.
    def build_hits(rows)
      return [] if rows.empty?

      events = Event.where(id: rows.map(&:first)).includes(:venue, sponsorships: { sponsor: { logo_attachment: :blob } })
                    .with_attached_cover.preload(:host).index_by(&:id)
      preload_hosts(events.values)
      occurrences = EventOccurrence.where(id: rows.map { |row| row[1] }.compact).index_by(&:id)
      rows.filter_map do |row|
        event = events[row[0]]
        next if event.nil?

        EventHit.new(event: event, next_occurrence: occurrences[row[1]], distance_m: distance_from(row), stale: stale_from(row))
      end
    end

    def preload_hosts(events)
      hosts = events.map(&:host)
      ActiveRecord::Associations::Preloader.new(records: hosts.grep(User), associations: :profile).call
      ActiveRecord::Associations::Preloader.new(records: hosts.grep(Club), associations: { avatar_attachment: :blob }).call
      ActiveRecord::Associations::Preloader.new(records: hosts.grep(Sponsor), associations: { logo_attachment: :blob }).call
    end

    def uuid!(value)
      raise ParamError, Cursor::INVALID unless value.to_s.match?(Device::UUID)

      value
    end

    def time!(value)
      Time.iso8601(value.to_s)
    rescue ArgumentError
      raise ParamError, Cursor::INVALID
    end
  end
end

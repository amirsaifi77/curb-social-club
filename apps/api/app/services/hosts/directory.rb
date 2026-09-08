module Hosts
  # The club and sponsor directories (clubs R-7, R-18; sponsors R-7, R-17):
  # nearest first with an integer distance_m when `near` is present, most
  # followed first otherwise, filtered by trigram `q` and (for sponsors)
  # `kind`. Hidden rows never appear. Distance is PostGIS, never Ruby.
  class Directory
    DEFAULT_RADIUS_KM = 32
    SEARCH_RADIUS_KM = 80
    MAX_RADIUS_KM = 160
    NEAR_SORT = "near".freeze
    FOLLOWERS_SORT = "followers".freeze

    def self.call(model, params)
      new(model, params).call
    end

    def initialize(model, params)
      @model = model
      @params = params
      @origin = Geo::Coordinates.origin(params[:near])
      @q = Geo::EventFilters.parse_query(params[:q])
      @limit = Geo::ListQuery.parse_limit(params[:limit])
      @cursor = params[:cursor].presence
    end

    def call
      rows = paged.to_a
      more = rows.size > limit
      rows = rows.first(limit)
      Geo::Page.new(items: rows, next_cursor: more ? cursor_for(rows.last) : nil)
    end

    private

    attr_reader :model, :params, :origin, :q, :limit, :cursor

    def paged
      relation = filtered
      relation = relation.where(keyset_sql, *decoded_cursor) if cursor
      relation.order(Arel.sql(order_sql)).limit(limit + 1)
    end

    def filtered
      relation = model.visible.select(Arel.sql(select_sql)).then { |scope| with_images(scope) }
      relation = relation.where("#{table}.kind = ?", kind) if kind
      relation = relation.where("#{table}.name % ?", q) if q
      relation = relation.where("ST_DWithin(#{table}.home_location, #{origin_sql}, ?)", radius_m) if origin
      relation
    end

    def select_sql
      return "#{table}.*" if origin.nil?

      "#{table}.*, ST_Distance(#{table}.home_location, #{origin_sql})::integer AS distance_m"
    end

    def origin_sql
      @origin_sql ||= Geo.point_sql(origin.lat, origin.lng)
    end

    def table = model.table_name

    # Only sponsors have a kind; on clubs the parameter is meaningless and
    # its column does not exist.
    def kind
      return nil unless model == Sponsor

      value = params[:kind].to_s
      return nil if value.blank?
      raise Geo::ParamError, "kind must be from: #{Sponsor::KINDS.join(', ')}." unless Sponsor::KINDS.include?(value)

      value
    end

    # `q` with `near` searches a wider ring, as the event list does.
    def radius_m
      km = Geo::Coordinates.radius_km(params[:radius_km]) || (q ? SEARCH_RADIUS_KM : DEFAULT_RADIUS_KM)
      (km.to_f.clamp(0.1, MAX_RADIUS_KM) * 1000).round
    end

    # One attachment query per page rather than one per row.
    def with_images(scope)
      model == Sponsor ? scope.with_attached_logo : scope.with_attached_avatar
    end

    def sort_name = origin ? NEAR_SORT : FOLLOWERS_SORT

    def order_sql
      if origin
        "distance_m ASC, #{table}.id ASC"
      else
        # Both columns descend so the row comparison below can page a tie
        # group (at launch every followers_count is 0, so the whole
        # directory is one tie group).
        "#{table}.followers_count DESC, #{table}.id DESC"
      end
    end

    def keyset_sql
      if origin
        "(ST_Distance(#{table}.home_location, #{origin_sql})::integer, #{table}.id) > (?::integer, ?::uuid)"
      else
        "(#{table}.followers_count, #{table}.id) < (?::integer, ?::uuid)"
      end
    end

    def cursor_for(row)
      Geo::Cursor.encode(sort_name, [ origin ? row[:distance_m].to_i : row.followers_count, row.id ])
    end

    def decoded_cursor
      value, id = Geo::Cursor.decode(cursor, sort: sort_name, size: 2)
      raise Geo::ParamError, Geo::Cursor::INVALID unless id.to_s.match?(Device::UUID)

      [ Integer(value), id ]
    rescue ArgumentError, TypeError
      raise Geo::ParamError, Geo::Cursor::INVALID
    end
  end
end

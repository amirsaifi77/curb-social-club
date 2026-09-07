module Geo
  # GET /events with `near` (R-16): ST_DWithin on the btree_gist index over
  # (location, starts_at). Radius defaults to 32 km (80 with q) and clamps
  # at 160 km rather than failing (AC-2).
  class NearbyQuery < OccurrenceQuery
    DEFAULT_RADIUS_KM = 32
    SEARCH_RADIUS_KM = 80
    MAX_RADIUS_KM = 160

    attr_reader :radius_km

    def initialize(origin:, radius_km: nil, **rest)
      super(origin: origin, **rest)
      @radius_km = (radius_km || (filters.q ? SEARCH_RADIUS_KM : DEFAULT_RADIUS_KM)).to_f.clamp(0.1, MAX_RADIUS_KM)
    end

    private

    def spatial_sql
      "ST_DWithin(event_occurrences.location, #{origin_sql}, ?)"
    end

    def spatial_binds
      [ (radius_km * 1000).round ]
    end
  end
end

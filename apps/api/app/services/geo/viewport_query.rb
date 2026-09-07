module Geo
  # GET /events with `bbox` (R-17; discovery R-8): ST_Intersects against the
  # envelope. With `near` as well, the box filters and `near` supplies
  # distance_m and enables sort=distance.
  class ViewportQuery < OccurrenceQuery
    attr_reader :bbox

    def initialize(bbox:, **rest)
      super(**rest)
      @bbox = bbox
    end

    private

    def spatial_sql
      "ST_Intersects(event_occurrences.location, ST_MakeEnvelope(?, ?, ?, ?, 4326)::geography)"
    end

    def spatial_binds
      [ bbox.west, bbox.south, bbox.east, bbox.north ]
    end
  end
end

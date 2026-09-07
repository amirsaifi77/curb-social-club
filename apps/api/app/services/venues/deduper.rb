module Venues
  # One venue per real place (events spec R-6): reuse an existing venue
  # whose normalized name matches (lowercased, whitespace collapsed) and
  # whose location is within 100 m, otherwise create one. The importer
  # (1.10) and the admin venue form call this so two rows never describe
  # the same lot.
  class Deduper
    MATCH_RADIUS_M = 100
    # Matches Venue.normalize_name: trim, collapse whitespace, lowercase.
    NORMALIZED_NAME_SQL = "lower(regexp_replace(btrim(venues.name), '\\s+', ' ', 'g'))".freeze

    def self.find_or_create(attrs)
      attrs = attrs.symbolize_keys
      location = attrs[:location] || Geo.point(attrs.fetch(:lat), attrs.fetch(:lng))
      find_match(attrs[:name], location) || Venue.create!(attrs.except(:lat, :lng).merge(location: location))
    end

    # The nearest venue inside the radius that carries the same normalized
    # name, or nil.
    def self.find_match(name, location)
      normalized = Venue.normalize_name(name)
      return nil if normalized.blank?

      point = Geo.point_sql(location.y, location.x)
      Venue.where("#{NORMALIZED_NAME_SQL} = ?", normalized)
           .where("ST_DWithin(venues.location, #{point}, ?)", MATCH_RADIUS_M)
           .order(Arel.sql("ST_Distance(venues.location, #{point})"))
           .first
    end
  end
end

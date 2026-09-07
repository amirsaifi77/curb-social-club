# Geography helpers shared by models, factories, and later the geo queries.
# Every stored point is geography(Point,4326); the factory takes (lng, lat)
# in that order, so use Geo.point(lat, lng) with the fixture coordinates as
# written in the specs ("33.6172,-117.9270").
module Geo
  FACTORY = RGeo::Geographic.spherical_factory(srid: 4326)

  def self.point(lat, lng)
    FACTORY.point(lng.to_f, lat.to_f)
  end

  # The same point as a bound SQL fragment, for the queries that build
  # their own SQL. Always sanitized, never interpolated by the caller.
  def self.point_sql(lat, lng)
    ActiveRecord::Base.sanitize_sql_array([ "ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography", lng.to_f, lat.to_f ])
  end

  # True only for an IANA identifier such as America/Los_Angeles; Rails
  # display names ("Pacific Time (US & Canada)") are rejected because the
  # materializer hands this string to TZInfo.
  def self.iana_timezone?(name)
    return false unless name.is_a?(String)

    TZInfo::Timezone.get(name)
    true
  rescue TZInfo::InvalidTimezoneIdentifier
    false
  end
end

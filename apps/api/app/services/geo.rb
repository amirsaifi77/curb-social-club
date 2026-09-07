# Geography helpers shared by models, factories, and later the geo queries.
# Every stored point is geography(Point,4326); the factory takes (lng, lat)
# in that order, so use Geo.point(lat, lng) with the fixture coordinates as
# written in the specs ("33.6172,-117.9270").
module Geo
  FACTORY = RGeo::Geographic.spherical_factory(srid: 4326)

  def self.point(lat, lng)
    FACTORY.point(lng.to_f, lat.to_f)
  end
end

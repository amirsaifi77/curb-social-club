module Geo
  # Query-string coordinate parsing for the list and map endpoints.
  Origin = Data.define(:lat, :lng)
  Bbox = Data.define(:west, :south, :east, :north) do
    def width = east - west
    def height = north - south
  end

  module Coordinates
    NEAR_MESSAGE = "near must be lat,lng."
    BBOX_MESSAGE = "bbox must be w,s,e,n."
    MAX_MAP_DEGREES = 5

    def self.origin(value)
      return nil if value.blank?

      lat, lng = numbers(value, 2, NEAR_MESSAGE)
      raise ParamError, NEAR_MESSAGE unless lat.between?(-90, 90) && lng.between?(-180, 180)

      Origin.new(lat: lat, lng: lng)
    end

    def self.bbox(value, max_degrees: nil)
      return nil if value.blank?

      west, south, east, north = numbers(value, 4, BBOX_MESSAGE)
      valid = west.between?(-180, 180) && east.between?(-180, 180) && south.between?(-90, 90) && north.between?(-90, 90) &&
              west < east && south < north
      raise ParamError, BBOX_MESSAGE unless valid

      box = Bbox.new(west: west, south: south, east: east, north: north)
      if max_degrees && (box.width > max_degrees || box.height > max_degrees)
        raise ParamError, "bbox can be at most #{max_degrees} degrees wide. Zoom in."
      end

      box
    end

    def self.radius_km(value)
      return nil if value.blank?

      Float(value.to_s)
    rescue ArgumentError
      raise ParamError, "radius_km must be a number."
    end

    def self.numbers(value, count, message)
      parts = value.to_s.split(",")
      raise ParamError, message unless parts.size == count

      parts.map { |part| Float(part.strip) }
    rescue ArgumentError
      raise ParamError, message
    end
    private_class_method :numbers
  end
end

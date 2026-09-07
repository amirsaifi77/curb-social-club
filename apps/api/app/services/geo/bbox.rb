module Geo
  # The `bbox` of a list or map query: west, south, east, north in degrees.
  # A box crossing the antimeridian is rejected by Coordinates (west < east).
  Bbox = Data.define(:west, :south, :east, :north) do
    def width = east - west
    def height = north - south
  end
end

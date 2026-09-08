# MapPin (docs/api.md): flat and small, one per event, from a Geo::MapPin.
class MapPinResource
  include Alba::Resource

  attributes :id, :event_id, :slug, :lat, :lng, :title, :going_count
  # discovery R-15: the map draws a series in the recurring pin style, and a
  # pin is all the client has to decide that from.
  attribute(:recurring) { |pin| pin.recurring }
  attribute(:starts_at) { |pin| pin.starts_at.utc.iso8601 }
end

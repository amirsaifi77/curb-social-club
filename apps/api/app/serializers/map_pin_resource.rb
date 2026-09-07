# MapPin (docs/api.md): flat and small, one per event, from a Geo::MapPin.
class MapPinResource
  include Alba::Resource

  attributes :id, :event_id, :slug, :lat, :lng, :title, :going_count
  attribute(:starts_at) { |pin| pin.starts_at.utc.iso8601 }
end

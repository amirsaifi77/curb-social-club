module Geo
  # docs/api.md MapPin: id is the occurrence, one pin per event.
  MapPin = Data.define(:id, :event_id, :slug, :lat, :lng, :starts_at, :title, :going_count, :recurring)
end

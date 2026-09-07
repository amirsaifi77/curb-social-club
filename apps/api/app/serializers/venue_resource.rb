# The full venue on Event detail (docs/api.md Event): the summary venue
# plus the address lines, region, postal code, country, and timezone.
class VenueResource
  include Alba::Resource

  attributes :id, :name, :address_line1, :address_line2, :city, :region, :postal_code, :country, :timezone

  attribute :location do |venue|
    { lat: venue.location.y.round(6), lng: venue.location.x.round(6) }
  end
end

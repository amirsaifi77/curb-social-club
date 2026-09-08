# Provider geocoding for GET /venues/search only (docs/api.md Venues).
# Google when GEOCODER_GOOGLE_KEY is set, otherwise the keyless default so
# development works without an account; results are cached for a day by
# Venues::Search, and a provider failure degrades to no suggestions.
Geocoder.configure(
  lookup: ENV["GEOCODER_GOOGLE_KEY"].present? ? :google : :nominatim,
  api_key: ENV["GEOCODER_GOOGLE_KEY"].presence,
  timeout: 3,
  units: :km,
  http_headers: { "User-Agent" => "curb-social-club (hello@curbsocial.club)" }
)

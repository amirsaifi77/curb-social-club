# Provider geocoding for GET /venues/search only (docs/api.md Venues).
# Google when GEOCODER_GOOGLE_KEY is set, otherwise the keyless default so
# development works without an account; results are cached for a day by
# Venues::Search, and a provider failure degrades to no suggestions.
# The test environment pins the keyless lookup so the suite asserts the
# same provider whether or not a key happens to be in the shell.
lookup = if !Rails.env.test? && ENV["GEOCODER_GOOGLE_KEY"].present?
  :google
else
  :nominatim
end

Geocoder.configure(
  lookup: lookup,
  api_key: lookup == :google ? ENV["GEOCODER_GOOGLE_KEY"] : nil,
  # Raise rather than swallow, so Venues::Search can tell a provider outage
  # (do not cache) from a query with no matches (cache for the day).
  always_raise: :all,
  timeout: 3,
  units: :km,
  http_headers: { "User-Agent" => "curb-social-club (hello@curbsocial.club)" }
)

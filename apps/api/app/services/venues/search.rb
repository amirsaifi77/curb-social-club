module Venues
  # GET /venues/search (docs/api.md Venues): the venues we already have
  # first, nearest first, then provider suggestions for places we do not.
  # Provider results are cached for a day per query, because the same
  # search repeats across every host adding the same coffee shop.
  class Search
    EXISTING_LIMIT = 5
    SUGGESTION_LIMIT = 5
    CACHE_TTL = 24.hours

    Suggestion = Data.define(:name, :address, :lat, :lng, :external_place_id, :external_source)

    def self.call(query:, origin: nil)
      new(query: query, origin: origin).call
    end

    def initialize(query:, origin:)
      @query = query.to_s.strip
      @origin = origin
    end

    def call
      { venues: existing, suggestions: query.length < 3 ? [] : suggestions }
    end

    private

    attr_reader :query, :origin

    def existing
      return [] if query.blank?

      scope = Venue.where("venues.name % ?", query)
      scope = scope.order(Arel.sql("ST_Distance(venues.location, #{Geo.point_sql(origin.lat, origin.lng)})")) if origin
      scope.limit(EXISTING_LIMIT).to_a
    end

    def suggestions
      Rails.cache.fetch(cache_key, expires_in: CACHE_TTL) { provider_results }
    end

    # A provider outage costs suggestions, never the endpoint.
    def provider_results
      Geocoder.search(query, params: geocoder_params).first(SUGGESTION_LIMIT).filter_map do |result|
        next if result.latitude.nil? || result.longitude.nil?

        Suggestion.new(name: result.address.to_s.split(",").first.presence || query, address: result.address.to_s,
                       lat: result.latitude.round(6), lng: result.longitude.round(6),
                       external_place_id: result.data["place_id"]&.to_s, external_source: Geocoder.config.lookup.to_s)
                  .to_h
      end
    rescue StandardError => e
      Rails.logger.warn("Venues::Search provider failed: #{e.class}: #{e.message}")
      []
    end

    def geocoder_params
      origin ? { proximity: "#{origin.lat},#{origin.lng}" } : {}
    end

    def cache_key
      [ "venue_search", query.downcase, origin && "#{origin.lat.round(2)},#{origin.lng.round(2)}" ].compact.join(":")
    end
  end
end

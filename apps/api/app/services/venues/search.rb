module Venues
  # GET /venues/search (docs/api.md Venues): the venues we already have
  # first, nearest first, then provider suggestions for places we do not.
  # Provider results are cached for a day per query, because the same
  # search repeats across every host adding the same coffee shop.
  class Search
    EXISTING_LIMIT = 5
    SUGGESTION_LIMIT = 5
    CACHE_TTL = 24.hours
    # Long enough to bound the fan-out at a provider that allows one request
    # a second, short enough that recovery is a minute away, not a day.
    FAILURE_TTL = 60.seconds
    FAILED = "failed".freeze

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

      scope = Venue.where("venues.name % ?", query).order(existing_order)
      scope.limit(EXISTING_LIMIT).to_a
    end

    # Nearest first when we know where the caller is, otherwise closest by
    # name. Either way the tiebreak is total, so the same query gives the
    # same five rows.
    def existing_order
      if origin
        Arel.sql(Venue.sanitize_sql_array([ "ST_Distance(venues.location, #{Geo.point_sql(origin.lat, origin.lng)}) ASC, venues.name ASC, venues.id ASC" ]))
      else
        Arel.sql(Venue.sanitize_sql_array([ "similarity(venues.name, ?) DESC, venues.name ASC, venues.id ASC", query ]))
      end
    end

    # An empty result is a real answer worth caching for the day. An outage
    # is cached only for a minute: long enough that a type-ahead does not
    # hammer a provider that is down, short enough that recovery is quick.
    def suggestions
      cached = Rails.cache.read(cache_key)
      return cached == FAILED ? [] : cached unless cached.nil?

      results = provider_results
      Rails.cache.write(cache_key, results || FAILED, expires_in: results ? CACHE_TTL : FAILURE_TTL)
      results || []
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
      nil
    end

    def geocoder_params
      origin ? { proximity: "#{origin.lat},#{origin.lng}" } : {}
    end

    def cache_key
      [ "venue_search", query.downcase, origin && "#{origin.lat.round(2)},#{origin.lng.round(2)}" ].compact.join(":")
    end
  end
end

module Api
  module V1
    # GET /v1/feed (discovery R-5, R-6, R-24): the sectioned home feed,
    # anonymous, served from Solid Cache for 60 seconds keyed by the
    # rounded origin, the radius, and whether a viewer is signed in.
    class FeedController < ApplicationController
      include HostPages

      CACHE_TTL = 60.seconds
      # Location privacy: the cache key rounds the origin the way clients
      # round browse coordinates (CLAUDE.md, two decimals).
      KEY_PRECISION = 2

      # GET /v1/feed
      def index
        origin = rounded(feed_origin)
        raise Geo::ParamError, "Send near as lat,lng, or a device with a home area." if origin.nil?

        payload = Rails.cache.fetch(cache_key(origin), expires_in: CACHE_TTL) { build(origin) }
        # A signed-in feed is viewer specific once `following` lands, and
        # its cache entry already is, so it never goes in a shared cache.
        current_user ? no_store : public_cache
        render json: payload
      end

      private

      def build(origin)
        sections = Feed::Builder.call(origin: origin, radius_km: radius_km)
        { data: { sections: sections.map { |section| section.to_h.merge(kind: section.kind.to_s) } },
          meta: { generated_at: Time.current.utc.iso8601 } }
      end

      # `near` wins; otherwise the device's home area (docs/api.md Feed).
      def feed_origin
        Geo::Coordinates.origin(params[:near]) || device_origin
      end

      # The feed is built from the same rounded origin the cache is keyed
      # on, so one caller's exact coordinates can never reach another's
      # response through a shared entry (CLAUDE.md, two decimals).
      def rounded(origin)
        return nil if origin.nil?

        Geo::Origin.new(lat: origin.lat.round(KEY_PRECISION), lng: origin.lng.round(KEY_PRECISION))
      end

      def device_origin
        location = current_device&.home_location
        return nil if location.nil?

        Geo::Origin.new(lat: location.y, lng: location.x)
      end

      # R-3: 32 km by default, 400 rather than a clamp above 160 (the
      # clamp belongs to GET /events, discovery AC-4).
      def radius_km
        value = Geo::Coordinates.radius_km(params[:radius_km]) || Geo::NearbyQuery::DEFAULT_RADIUS_KM
        raise Geo::ParamError, "radius_km can be at most #{Geo::NearbyQuery::MAX_RADIUS_KM}." if value > Geo::NearbyQuery::MAX_RADIUS_KM
        raise Geo::ParamError, "radius_km must be greater than 0." if value <= 0

        value
      end

      def cache_key(origin)
        [ "feed", origin.lat, origin.lng, radius_km, current_user ? "viewer" : "anon" ].join(":")
      end
    end
  end
end

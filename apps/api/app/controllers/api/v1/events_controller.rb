module Api
  module V1
    # Public event lists (events spec R-16 to R-21; discovery R-7 to R-9).
    # Anonymous, cacheable for 30 seconds per docs/api.md Conventions; the
    # payload carries nothing viewer-specific in Phase 1.
    class EventsController < ApplicationController
      rescue_from Geo::ParamError do |e|
        render_error :bad_request, e.message, status: :bad_request
      end

      before_action :public_cache

      # GET /v1/events
      def index
        page = Geo::EventsList.call(params)
        render json: { data: EventSummaryResource.new(page.items).to_h, meta: { next_cursor: page.next_cursor, total: nil } }
      end

      # GET /v1/events/map
      def map
        bbox = Geo::Coordinates.bbox(params[:bbox], max_degrees: Geo::Coordinates::MAX_MAP_DEGREES)
        raise Geo::ParamError, "Send bbox as w,s,e,n." if bbox.nil?

        window = Geo::Window.parse(from: params[:from], to: params[:to])
        filters = Geo::EventFilters.from_params(params, geo_only: true)
        result = Geo::MapQuery.new(bbox: bbox, window: window, filters: filters).call
        render json: { data: MapPinResource.new(result.pins).to_h, meta: { truncated: result.truncated } }
      end

      private

      def public_cache
        expires_in 30.seconds, public: true, stale_while_revalidate: 300.seconds
      end
    end
  end
end

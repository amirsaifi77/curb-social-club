module Api
  module V1
    # Public event lists (events spec R-16 to R-21; discovery R-7 to R-9).
    # Anonymous, cacheable for 30 seconds per docs/api.md Conventions; the
    # payload carries nothing viewer-specific in Phase 1.
    class EventsController < ApplicationController
      NEARBY_LIMIT = 3
      # One read-time re-materialization per event per hour, however hot the
      # page is; the nightly run does the rest.
      MATERIALIZE_THROTTLE = 1.hour

      rescue_from Geo::ParamError do |e|
        no_store
        render_error :bad_request, e.message, status: :bad_request
      end

      before_action :public_cache, only: %i[index map]

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

      # GET /v1/events/:slug (R-22; event-detail-and-rsvp.md R-4 to R-6)
      def show
        event = Event.with_stale.includes(:venue, sponsorships: { sponsor: { logo_attachment: :blob } })
                     .with_attached_cover.find_by(slug: params[:slug])
        return render_not_found if event.nil?

        policy = EventPolicy.new(current_user, event)
        return render_not_found if event.draft? && !policy.edit?
        # The unlisted check comes first, so a tokenless request cannot tell
        # a cancelled unlisted event from a slug that does not exist (R-5).
        return render_not_found if event.unlisted? && !policy.edit? && !Events::UnlistedToken.valid?(params[:token], event.id)
        return render_gone if event.gone? && !policy.edit?

        schedule_materialize(event)
        detail_cache
        render_data EventResource.new(Geo::EventHit.for(event), params: { viewer: current_user }).to_h
      end

      # POST /v1/events/:id/confirm (R-24, R-28)
      def confirm
        event = Event.find(params[:id])
        return require_user! if current_user.nil? || current_user.suspended?

        authorize event, :confirm?
        # Clearing dormant_at is a schedule change, so the Event callback
        # enqueues the materializer exactly once (R-24, R-28); confirming an
        # event that was not dormant enqueues nothing.
        event.update!(last_confirmed_at: Time.current, dormant_at: nil)
        no_store
        render_data EventResource.new(Geo::EventHit.for(Event.with_stale.find(event.id)), params: { viewer: current_user }).to_h
      end

      private

      def render_not_found
        no_store
        render_error :not_found, "Event not found", status: :not_found
      end

      # R-14: a missed nightly run self-heals on read, at most once an hour
      # per event, so a hot page cannot flood the queue (and a seasonal
      # series past its rrule_until cannot enqueue on every request).
      def schedule_materialize(event)
        return unless event.horizon_short?
        return unless Rails.cache.write("materialize:#{event.id}", true, expires_in: MATERIALIZE_THROTTLE, unless_exist: true)

        MaterializeOccurrencesJob.perform_later(event.id)
      end

      # R-6: a cancelled or hidden event is gone for the public, with a few
      # nearby meets when the client sent a usable location.
      def render_gone
        no_store
        render json: { error: { code: :gone, message: "This meet is no longer listed.",
                                details: { nearby: nearby_summaries } } }, status: :gone
      end

      def nearby_summaries
        origin = Geo::Coordinates.origin(params[:near])
        return [] if origin.nil?

        page = Geo::NearbyQuery.new(origin: origin, window: Geo::Window.parse,
                                    filters: Geo::EventFilters.from_params({}), limit: NEARBY_LIMIT).call
        EventSummaryResource.new(page.items).to_h
      rescue Geo::ParamError
        # A bad device coordinate should not turn "no longer listed" into a
        # generic 400; the page just loses its nearby list.
        []
      end

      # The detail carries viewer fields once someone is signed in, so only
      # the anonymous response is publicly cacheable.
      def detail_cache
        current_user ? no_store : public_cache
      end
    end
  end
end

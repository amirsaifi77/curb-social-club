module Api
  module V1
    # Occurrence reads (events-and-occurrences.md R-22). Anonymous, and
    # scoped to events the viewer may see, so an unlisted or draft event's
    # dates are not readable by id.
    class OccurrencesController < ApplicationController
      PAGE_SORT = "occurrence".freeze

      rescue_from Geo::ParamError do |e|
        no_store
        render_error :bad_request, e.message, status: :bad_request
      end

      # GET /v1/events/:id/occurrences
      def index
        event = load_event(params[:id])
        return render_not_found unless EventPolicy.new(current_user, event).show?

        page = paginate(event.occurrences.upcoming.where(status: %w[scheduled cancelled]).chronological)
        # One hit for the event, so a page of dates costs the same as one.
        hit = Geo::EventHit.for(event)
        cache_for(event)
        render json: { data: page.items.map { |occurrence| OccurrenceResource.new(occurrence, params: { event_hit: hit }).to_h },
                       meta: { next_cursor: page.next_cursor, total: nil } }
      end

      # GET /v1/occurrences/:id
      def show
        occurrence = EventOccurrence.find(params[:id])
        event = load_event(occurrence.event_id)
        return render_not_found unless EventPolicy.new(current_user, event).show?

        cache_for(event)
        render_data OccurrenceResource.new(occurrence, params: { event_hit: Geo::EventHit.for(event) }).to_h
      end

      private

      def load_event(id)
        Event.with_stale.includes(:venue, sponsorships: { sponsor: { logo_attachment: :blob } }).with_attached_cover.find(id)
      end

      # Only a page the public may read is publicly cacheable; a host
      # reading their own draft's dates gets a private response.
      def cache_for(event)
        EventPolicy.new(nil, event).show? ? public_cache : no_store
      end

      def paginate(scope)
        limit = Geo::ListQuery.parse_limit(params[:limit])
        scope = after_cursor(scope) if params[:cursor].present?
        rows = scope.limit(limit + 1).to_a
        more = rows.size > limit
        rows = rows.first(limit)
        cursor = more ? Geo::Cursor.encode(PAGE_SORT, [ rows.last.starts_at.utc.iso8601(6), rows.last.id ]) : nil
        Geo::Page.new(items: rows, next_cursor: cursor)
      end

      # Both halves are parsed here, never handed to Postgres to cast: a
      # crafted cursor is a 400, never a 500.
      def after_cursor(scope)
        starts_at, id = Geo::Cursor.decode(params[:cursor], sort: PAGE_SORT, size: 2)
        raise Geo::ParamError, Geo::Cursor::INVALID unless id.to_s.match?(Device::UUID)

        scope.where("(event_occurrences.starts_at, event_occurrences.id) > (?::timestamptz, ?::uuid)",
                    Time.iso8601(starts_at.to_s), id)
      rescue ArgumentError, TypeError
        raise Geo::ParamError, Geo::Cursor::INVALID
      end

      def render_not_found
        no_store
        render_error :not_found, "Event not found", status: :not_found
      end
    end
  end
end

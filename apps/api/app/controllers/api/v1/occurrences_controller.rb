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
        event = Event.find(params[:id])
        return render_not_found unless EventPolicy.new(current_user, event).show?

        page = paginate(event.occurrences.upcoming.where(status: %w[scheduled cancelled]).chronological)
        public_cache
        render json: { data: page.items.map { |occurrence| OccurrenceResource.new(occurrence).to_h },
                       meta: { next_cursor: page.next_cursor, total: nil } }
      end

      # GET /v1/occurrences/:id
      def show
        occurrence = EventOccurrence.includes(event: :venue).find(params[:id])
        event = Event.with_stale.find(occurrence.event_id)
        return render_not_found unless EventPolicy.new(current_user, event).show?

        public_cache
        render_data OccurrenceResource.new(occurrence).to_h
      end

      private

      def paginate(scope)
        limit = Geo::ListQuery.parse_limit(params[:limit])
        scope = after_cursor(scope) if params[:cursor].present?
        rows = scope.limit(limit + 1).to_a
        more = rows.size > limit
        rows = rows.first(limit)
        cursor = more ? Geo::Cursor.encode(PAGE_SORT, [ rows.last.starts_at.utc.iso8601(6), rows.last.id ]) : nil
        Geo::Page.new(items: rows, next_cursor: cursor)
      end

      def after_cursor(scope)
        starts_at, id = Geo::Cursor.decode(params[:cursor], sort: PAGE_SORT, size: 2)
        raise Geo::ParamError, Geo::Cursor::INVALID unless id.to_s.match?(Device::UUID)

        scope.where("(event_occurrences.starts_at, event_occurrences.id) > (?::timestamptz, ?::uuid)", starts_at, id)
      rescue ArgumentError
        raise Geo::ParamError, Geo::Cursor::INVALID
      end

      def render_not_found
        no_store
        render_error :not_found, "Event not found", status: :not_found
      end
    end
  end
end

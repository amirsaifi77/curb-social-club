module Geo
  # Turns GET /events query params into the right query (nearby, viewport,
  # or direct) and runs it. Every parameter problem raises Geo::ParamError,
  # which the controller renders as 400 bad_request with the message.
  class EventsList
    def self.call(params, now: Time.current)
      new(params, now: now).call
    end

    def initialize(params, now:)
      @params = params
      @now = now
    end

    def call
      origin = Coordinates.origin(params[:near])
      bbox = Coordinates.bbox(params[:bbox])
      geo = origin || bbox
      filters = EventFilters.from_params(params)
      window = Window.parse(from: params[:from], to: params[:to], now: now, open_ended: geo.nil?)
      common = { window: window, filters: filters, limit: params[:limit] || ListQuery::DEFAULT_LIMIT, cursor: params[:cursor] }

      if bbox
        ViewportQuery.new(bbox: bbox, origin: origin, sort: sort, now: now, **common).call
      elsif origin
        NearbyQuery.new(origin: origin, radius_km: Coordinates.radius_km(params[:radius_km]), sort: sort, now: now, **common).call
      else
        raise ParamError, "Send near to sort by distance." if sort == "distance"

        DirectQuery.new(past: past?, **common).call
      end
    end

    private

    attr_reader :params, :now

    # docs/api.md Clubs: a host page lists upcoming meets, then past ones.
    def past?
      params[:past].to_s == "true"
    end

    def sort
      value = params[:sort].to_s
      return "date" if value.blank?
      raise ParamError, "sort must be date or distance." unless OccurrenceQuery::SORTS.include?(value)

      value
    end
  end
end

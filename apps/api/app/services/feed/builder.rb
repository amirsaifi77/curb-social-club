module Feed
  # GET /feed (discovery R-5, R-6; clubs R-17; sponsors R-12, R-13).
  # Sections come back in display order with empty ones omitted. The three
  # event windows are local calendar days in the venue's timezone, so a
  # Sunday 23:30 meet is still "this weekend" wherever the reader is.
  class Builder
    EVENTS_PER_SECTION = 10
    CLUBS_LIMIT = 6
    SPONSORS_LIMIT = 4
    TITLES = {
      this_weekend: "This weekend",
      clubs_nearby: "Clubs near you",
      sponsors_nearby: "Sponsors near you",
      next_week: "Next week",
      later: "Later"
    }.freeze

    def self.call(origin:, radius_km:, now: Time.current)
      new(origin: origin, radius_km: radius_km, now: now).call
    end

    def initialize(origin:, radius_km:, now:)
      @origin = origin
      @radius_km = radius_km
      @now = now
    end

    # Display order, minus the sections that need Phase 2 and Phase 4
    # tables (`following`, `recent_photos`, `spots_nearby`).
    def call
      [ event_section(:this_weekend, today..weekend_end),
        clubs_section,
        sponsors_section,
        event_section(:next_week, (weekend_end + 1)..(weekend_end + 7)),
        event_section(:later, (weekend_end + 8)..horizon_day) ].compact
    end

    private

    attr_reader :origin, :radius_km, :now

    def zone = Time.zone
    def today = now.in_time_zone(zone).to_date
    # The coming Sunday, or today when today is Sunday.
    def weekend_end = today + ((7 - today.wday) % 7)
    def horizon_day = (now + Geo::Window::MAX_SPAN).in_time_zone(zone).to_date

    def event_section(kind, local_days)
      page = Geo::NearbyQuery.new(origin: origin, radius_km: radius_km, window: horizon_window,
                                  filters: Geo::EventFilters.from_params({}), local_days: local_days,
                                  limit: EVENTS_PER_SECTION, now: now).call
      return nil if page.items.empty?

      Section.new(kind: kind, title: TITLES.fetch(kind), items: EventSummaryResource.new(page.items).to_h,
                  more: more_link("/events", from: local_days.first.to_s, to: local_days.last.to_s))
    end

    def horizon_window
      Geo::Window.new(now, now + Geo::Window::MAX_SPAN)
    end

    def clubs_section
      page = Hosts::Directory.call(Club, ActionController::Parameters.new(
                                           near: near_param, radius_km: radius_km, limit: CLUBS_LIMIT
                                         ))
      return nil if page.items.empty?

      Section.new(kind: :clubs_nearby, title: TITLES.fetch(:clubs_nearby),
                  items: ClubSummaryResource.new(page.items).to_h, more: more_link("/clubs"))
    end

    # R-12: an active sponsor inside the radius that hosts or backs a
    # scheduled occurrence inside the radius, soonest meet first. No paid
    # key at launch, and none is ever added without the label (R-13).
    def sponsors_section
      sponsors = Sponsors::Nearby.call(origin: origin, radius_km: radius_km, limit: SPONSORS_LIMIT, now: now)
      return nil if sponsors.empty?

      Section.new(kind: :sponsors_nearby, title: TITLES.fetch(:sponsors_nearby),
                  items: SponsorSummaryResource.new(sponsors).to_h, more: more_link("/sponsors"))
    end

    def near_param = "#{origin.lat},#{origin.lng}"

    def more_link(path, **params)
      { path: path, params: { near: near_param, radius_km: radius_km }.merge(params) }
    end
  end
end

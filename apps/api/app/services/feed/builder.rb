module Feed
  # GET /feed (discovery R-5, R-6; clubs R-17; sponsors R-12, R-13).
  # Sections come back in display order with empty ones omitted. The three
  # event windows are local calendar days in the venue's timezone, decided
  # row by row in SQL, so a Sunday 23:30 meet is still "this weekend"
  # wherever the reader and the server happen to be.
  class Builder
    EVENTS_PER_SECTION = 10
    CLUBS_LIMIT = 6
    SPONSORS_LIMIT = 4
    # A section is a venue-local calendar day range, so no single UTC window
    # matches it exactly. The "See all" link widens by a day on each side,
    # which covers every UTC offset and makes the list a superset of the
    # section rather than the subset a bare date range would give.
    TIMEZONE_SLACK = 1.day
    # A venue's local date is the UTC date, the day before it, or the day
    # after. Across the Sunday to Monday boundary those give weekend ends a
    # week apart, so the link has to span all three.
    CANDIDATE_OFFSETS = [ -1, 0, 1 ].freeze
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
      [ event_section(:this_weekend),
        clubs_section,
        sponsors_section,
        event_section(:next_week),
        event_section(:later) ].compact
    end

    private

    attr_reader :origin, :radius_km, :now

    def event_section(kind)
      page = Geo::NearbyQuery.new(origin: origin, radius_km: radius_km, window: horizon_window,
                                  filters: Geo::EventFilters.from_params({}), section: kind,
                                  limit: EVENTS_PER_SECTION, now: now).call
      return nil if page.items.empty?

      from, to = more_window(kind)
      Section.new(kind: kind, title: TITLES.fetch(kind), items: EventSummaryResource.new(page.items).to_h,
                  more: more_link("/events", from: from.utc.iso8601, to: to.utc.iso8601))
    end

    def horizon_window
      Geo::Window.new(now, now + Geo::Window::MAX_SPAN)
    end

    # Timestamps, not bare dates: Geo::Window reads a bare date as UTC
    # midnight, which cuts the far side of the section off the list. The
    # window spans every candidate local date, so it is tight for five days
    # of the week and deliberately wide across the weekend boundary, where
    # nothing narrower can hold the whole section.
    def more_window(kind)
      ranges = CANDIDATE_OFFSETS.map { |offset| section_days(kind, today + offset) }
      from = day_start(ranges.map(&:first).min) - TIMEZONE_SLACK
      to = kind == :later ? now + Geo::Window::MAX_SPAN : day_start(ranges.map(&:last).max + 1) + TIMEZONE_SLACK
      [ [ from, now ].max, to ]
    end

    # The local days a section covers for a reader whose local date is
    # `day`. `later` runs to the horizon, so only its first day matters.
    def section_days(kind, day)
      weekend_end = day + ((7 - day.wday) % 7)
      case kind
      when :this_weekend then [ day, weekend_end ]
      when :next_week then [ weekend_end + 1, weekend_end + 7 ]
      else [ weekend_end + 8, weekend_end + 8 ]
      end
    end

    # The UTC reference day for the link only. The section itself is decided
    # per venue timezone in Geo::OccurrenceQuery::SECTION_SQL.
    def today = now.utc.to_date
    def day_start(date) = date.in_time_zone("UTC")

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

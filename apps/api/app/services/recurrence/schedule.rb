module Recurrence
  # Builds the ice_cube schedule for an event from its dtstart, timezone,
  # and validated rrule. The start is an ActiveSupport::TimeWithZone in the
  # event's zone so local start times survive DST (events spec R-12: a 7:30
  # Saturday rule is 14:30Z before 2026-11-01 and 15:30Z after). Weeks
  # start on Monday, the RFC 5545 default, so an interval rule keeps a
  # Saturday and the Sunday after it in the same week.
  class Schedule
    DAYS = {
      "MO" => :monday, "TU" => :tuesday, "WE" => :wednesday, "TH" => :thursday,
      "FR" => :friday, "SA" => :saturday, "SU" => :sunday
    }.freeze
    MONTHLY_BYDAY = /\A(-?\d)([A-Z]{2})\z/

    def self.for(event)
      rule = RruleValidator.parse(event.rrule)
      raise ArgumentError, "event #{event.id} has no valid rrule" if rule.nil? || event.dtstart.nil?

      build(dtstart: event.dtstart, timezone: event.timezone, rule: rule)
    end

    def self.build(dtstart:, timezone:, rule:)
      zone = ActiveSupport::TimeZone[timezone] or raise ArgumentError, "unknown timezone #{timezone}"
      schedule = IceCube::Schedule.new(dtstart.in_time_zone(zone))
      schedule.add_recurrence_rule(ice_cube_rule(rule))
      schedule
    end

    # The one translator from the R-4 grammar to ice_cube: weekly BYDAY
    # lists become day validations, monthly ordinals such as 1SU and -1SA
    # become day_of_week(sunday: [1]) and day_of_week(saturday: [-1]).
    def self.ice_cube_rule(rule)
      case rule.freq
      when "WEEKLY"
        IceCube::Rule.weekly(rule.interval, :monday).day(*rule.byday.map { |day| DAYS.fetch(day) })
      when "MONTHLY"
        ordinal, day = rule.byday.first.match(MONTHLY_BYDAY).captures
        IceCube::Rule.monthly(rule.interval).day_of_week(DAYS.fetch(day) => [ ordinal.to_i ])
      else
        raise ArgumentError, "unsupported FREQ #{rule.freq}"
      end
    end
  end
end

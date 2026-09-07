module Geo
  # The occurrence window for lists and the map (events spec R-16): default
  # now to +14 days, at most 90 days. Direct (non-geo) lists are open ended
  # unless the caller sends `to`, so a host page shows the next date however
  # far out it is.
  class Window
    DEFAULT_SPAN = 14.days
    MAX_SPAN = 90.days
    TOO_LONG = "The window can be at most 90 days."

    attr_reader :from, :to

    def self.parse(from: nil, to: nil, now: Time.current, open_ended: false)
      start = from.present? ? parse_time(from, "from") : now
      finish = to.present? ? parse_time(to, "to") : (open_ended ? nil : start + DEFAULT_SPAN)
      raise ParamError, "to must be after from." if finish && finish <= start
      raise ParamError, TOO_LONG if finish && finish - start > MAX_SPAN

      new(start, finish)
    end

    def self.parse_time(value, name)
      text = value.to_s
      return Time.iso8601(text) if text.include?("T")

      Date.iso8601(text).in_time_zone("UTC")
    rescue ArgumentError, Date::Error
      raise ParamError, "#{name} must be an ISO 8601 timestamp."
    end
    private_class_method :parse_time

    def initialize(from, to)
      @from = from
      @to = to
    end

    def range
      to ? (from..to) : (from..)
    end
  end
end

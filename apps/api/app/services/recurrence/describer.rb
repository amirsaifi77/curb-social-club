module Recurrence
  # rrule_text for the Event shape (events spec R-15 and the Copy table).
  # Server-side only; clients render the string as received.
  class Describer
    ANNOUNCED = "Dates announced by the host"
    DAY_NAMES = {
      "MO" => "Monday", "TU" => "Tuesday", "WE" => "Wednesday", "TH" => "Thursday",
      "FR" => "Friday", "SA" => "Saturday", "SU" => "Sunday"
    }.freeze
    ORDINALS = { 1 => "First", 2 => "Second", 3 => "Third", 4 => "Fourth", -1 => "Last" }.freeze

    def self.call(event)
      return nil if event.cadence == "once"
      return ANNOUNCED if event.cadence == "announced"

      rule = RruleValidator.parse(event.rrule)
      return nil if rule.nil?

      text = rule.freq == "WEEKLY" ? weekly(rule) : monthly(rule)
      text = "#{text} through #{until_text(event)}" if event.cadence == "seasonal" && event.rrule_until
      text
    end

    def self.weekly(rule)
      days = rule.byday.map { |day| DAY_NAMES.fetch(day) }.to_sentence
      case rule.interval
      when 1 then "Every #{days}"
      when 2 then "Every other #{days}"
      else "Every #{rule.interval} weeks on #{days}"
      end
    end

    def self.monthly(rule)
      ordinal, day = rule.byday.first.match(Schedule::MONTHLY_BYDAY).captures
      base = "#{ORDINALS.fetch(ordinal.to_i)} #{DAY_NAMES.fetch(day)}"
      case rule.interval
      when 1 then "#{base} of the month"
      when 2 then "#{base} of every other month"
      else "#{base} every #{rule.interval} months"
      end
    end

    def self.until_text(event)
      event.rrule_until.in_time_zone(event.timezone).strftime("%b %-d")
    end
    private_class_method :weekly, :monthly, :until_text
  end
end

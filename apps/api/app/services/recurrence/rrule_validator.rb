module Recurrence
  # The rrule grammar from docs/specs/events-and-occurrences.md R-4, checked
  # without ice_cube: FREQ in WEEKLY or MONTHLY, optional INTERVAL 1 to 4,
  # BYDAY required (weekly: one or more of MO..SU; monthly: exactly one
  # ordinal day such as 1SU or -1SA), nothing else, so UNTIL and COUNT are
  # rejected (the bound lives in events.rrule_until). Used both as an Active
  # Model validator on events.rrule and directly via .parse by the cadence
  # rules and, in 1.2, the materializer and describer.
  class RruleValidator < ActiveModel::EachValidator
    MESSAGE = "must be FREQ=WEEKLY or FREQ=MONTHLY with BYDAY and no UNTIL or COUNT"
    KEYS = %w[FREQ INTERVAL BYDAY].freeze
    FREQS = %w[WEEKLY MONTHLY].freeze
    WEEKDAYS = %w[MO TU WE TH FR SA SU].freeze
    INTERVAL_FORMAT = /\A[1-4]\z/
    MONTHLY_ORDINAL = /\A(?:-1|[1-4])(?:MO|TU|WE|TH|FR|SA|SU)\z/

    Rule = Data.define(:freq, :interval, :byday)

    # Returns a Rule for a valid string and nil for anything else.
    def self.parse(value)
      return nil unless value.is_a?(String)

      pairs = value.split(";", -1).map { |part| part.split("=", -1) }
      return nil unless pairs.all? { |pair| pair.size == 2 && pair.none?(&:empty?) }

      keys = pairs.map(&:first)
      return nil unless keys.uniq.size == keys.size && (keys - KEYS).empty?

      parts = pairs.to_h
      freq = parts["FREQ"]
      interval = parts.fetch("INTERVAL", "1")
      byday = parts.fetch("BYDAY", "").split(",", -1)
      return nil unless FREQS.include?(freq) && interval.match?(INTERVAL_FORMAT) && byday_valid?(freq, byday)

      Rule.new(freq: freq, interval: interval.to_i, byday: byday)
    end

    def self.valid?(value)
      !parse(value).nil?
    end

    def self.byday_valid?(freq, byday)
      return false if byday.empty?

      case freq
      when "WEEKLY" then byday.uniq.size == byday.size && byday.all? { |day| WEEKDAYS.include?(day) }
      when "MONTHLY" then byday.size == 1 && byday.first.match?(MONTHLY_ORDINAL)
      else false
      end
    end
    private_class_method :byday_valid?

    # Nil is left to the cadence rules (R-3), which decide whether a rule is
    # required at all.
    def validate_each(record, attribute, value)
      return if value.nil? || self.class.valid?(value)

      record.errors.add(attribute, :invalid_rrule, message: MESSAGE)
    end
  end
end

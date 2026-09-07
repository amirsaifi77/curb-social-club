module Recurrence
  # Expands one event's schedule into event_occurrences rows (events spec
  # R-10, R-11; architecture 3.5). Idempotent: running it twice changes no
  # row. Writes only rows whose overridden_at is null, inserts on
  # (event_id, starts_at), re-schedules a row the rule produces again,
  # cancels (never deletes) a future scheduled row the rule no longer
  # produces, creates exactly one row for once, and nothing for announced,
  # draft, cancelled, or dormant events.
  class Materializer
    HORIZON = 90.days

    Result = Data.define(:created, :updated, :cancelled, :skipped)

    def self.call(event, now: Time.current)
      new(event, now: now).call
    end

    def initialize(event, now:)
      @event = event
      @now = now
      @zone = ActiveSupport::TimeZone[event.timezone]
    end

    def call
      return Result.new(created: 0, updated: 0, cancelled: 0, skipped: true) unless event.materializable?

      event.transaction do
        candidates = produced_starts.reject { |starts_at| overridden_dates.include?(local_date(starts_at)) }
        existing = event.occurrences.where(starts_at: candidates).index_by { |row| row.starts_at.to_i }
        created = insert_rows(candidates.reject { |starts_at| existing.key?(starts_at.to_i) })
        updated = refresh_rows(existing.values)
        cancelled = cancel_missing(candidates)
        event.recount_occurrences!
        Result.new(created: created, updated: updated, cancelled: cancelled, skipped: false)
      end
    end

    private

    attr_reader :event, :now, :zone

    # UTC start times the rule produces that have not ended yet. Recurring
    # rules stop at the horizon or rrule_until, whichever is sooner; a once
    # event keeps its single date even beyond the horizon.
    def produced_starts
      return [] if event.dtstart.nil?

      times =
        if event.recurring?
          Schedule.for(event).occurrences_between(now - duration, horizon)
        else
          [ event.dtstart ]
        end
      times.map { |time| Time.at(time.to_i).utc }.select { |starts_at| starts_at + duration > now }
    end

    def horizon
      [ now + HORIZON, event.rrule_until ].compact.min
    end

    def duration
      event.duration_minutes.minutes
    end

    # A host-edited row owns its local calendar day: the rule's time for
    # that day is neither inserted beside it nor allowed to cancel it (AC-8).
    def overridden_dates
      @overridden_dates ||= event.occurrences.where.not(overridden_at: nil).pluck(:starts_at).map { |t| local_date(t) }.to_set
    end

    def local_date(time)
      time.in_time_zone(zone).to_date
    end

    def insert_rows(starts)
      return 0 if starts.empty?

      rows = starts.map do |starts_at|
        { event_id: event.id, starts_at: starts_at, ends_at: starts_at + duration, location: location,
          status: "scheduled", created_at: now, updated_at: now }
      end
      EventOccurrence.insert_all(rows, unique_by: [ :event_id, :starts_at ]).length
    end

    # Rows the rule still produces: back to scheduled if a previous run
    # cancelled them, and ends_at and location refreshed after a duration
    # or venue change. Overridden rows are never touched.
    def refresh_rows(rows)
      rows.count do |row|
        next false if row.overridden?

        expected = { status: "scheduled", ends_at: row.starts_at + duration, location: location }
        next false if row.status == "scheduled" && row.ends_at == expected[:ends_at] && row.location == location

        row.update_columns(expected.merge(updated_at: now))
        true
      end
    end

    def cancel_missing(candidates)
      event.occurrences.scheduled.where(overridden_at: nil).where("starts_at > ?", now)
           .where.not(starts_at: candidates).update_all(status: "cancelled", updated_at: now)
    end

    def location
      event.venue.location
    end
  end
end

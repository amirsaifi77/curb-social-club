module Geo
  # One list row: the event, its earliest scheduled occurrence in the
  # window (nil for announced events on host pages), the integer distance
  # from `near` (nil without it), and stale computed in SQL (R-25).
  EventHit = Data.define(:event, :next_occurrence, :distance_m, :stale) do
    # For the single-event endpoints, which have no list query to compute
    # the earliest occurrence and the stale flag for them.
    def self.for(event, distance_m: nil)
      new(event: event, next_occurrence: event.occurrences.scheduled.upcoming.chronological.first,
          distance_m: distance_m, stale: event.stale?)
    end
  end
end

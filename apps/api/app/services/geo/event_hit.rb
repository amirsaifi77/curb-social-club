module Geo
  # One list row: the event, its earliest scheduled occurrence in the
  # window (nil for announced events on host pages), the integer distance
  # from `near` (nil without it), and stale computed in SQL (R-25).
  EventHit = Data.define(:event, :next_occurrence, :distance_m, :stale)
end

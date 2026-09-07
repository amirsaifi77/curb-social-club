module Geo
  # A page of hits plus the opaque cursor for the next one (nil on the last).
  Page = Data.define(:items, :next_cursor)
end

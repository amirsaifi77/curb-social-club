module Feed
  # One row of the feed (docs/api.md Feed): the kind clients switch on, the
  # title from the Copy table, the items, and where "See all" goes.
  Section = Data.define(:kind, :title, :items, :more)
end

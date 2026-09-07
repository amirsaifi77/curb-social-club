# Seam for the block list (clubs R-8, profiles-and-follow R-13). The
# `blocks` table arrives with moderation-and-safety.md in Phase 2; until
# then every viewer blocks nobody, and the member and attendee lists
# already filter through here so the change is one method.
module Blocks
  def self.excluded_ids(_viewer)
    []
  end
end

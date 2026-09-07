# Undo the request-time hiding when a soft-deleted account signs back in
# within the window (R-17). Phase 1 tables add their unhide steps here
# (posts and comments back to visible).
class AccountRestoreJob < ApplicationJob
  queue_as :default

  def perform(user_id)
    User.find_by(id: user_id)
  end
end

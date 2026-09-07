# Nightly removal of expired sessions (R-29).
class SessionSweepJob < ApplicationJob
  queue_as :default

  def perform
    Session.expired.delete_all
  end
end

module Admin
  # A02 dashboard (docs/specs/admin.md R-13). Everything the schema can
  # answer today; reports and claims counts join in Phase 2.
  class DashboardController < BaseController
    self.moderator_access = true

    OCCURRENCE_WINDOW = 14.days

    def show
      @counts = counts
      @jobs = Admin::JobHealth.new
      @report = Rails.cache.read(HostConsistencyJob::REPORT_KEY)
      @decay = decay_counts
    end

    private

    def counts
      { "Published events" => Event.published.count,
        "Scheduled dates in the next 14 days" => upcoming_occurrences,
        "Venues" => Venue.count,
        "Active clubs" => Club.visible.count,
        "Active sponsors" => Sponsor.visible.count,
        "Users" => User.active.count,
        "Suspended users" => User.where(status: "suspended").count }
    end

    def upcoming_occurrences
      EventOccurrence.scheduled.where(starts_at: Time.current..(Time.current + OCCURRENCE_WINDOW)).count
    end

    # R-13's stale and dormant row, which the Copy table words as
    # "N unclaimed meets not confirmed in 30 days. M hidden after 90."
    def decay_counts
      { stale: Event.published.unclaimed.not_dormant.stale.count,
        dormant: Event.published.unclaimed.where.not(dormant_at: nil).count }
    end
  end
end

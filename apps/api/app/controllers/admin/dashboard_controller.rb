module Admin
  # A02 dashboard (docs/specs/admin.md R-13). Phase 0 shows the counts and
  # job health the schema can answer today; events, occurrences, venues,
  # clubs, sponsors, reports, and claims join as their tables land (slice 4).
  class DashboardController < BaseController
    self.moderator_access = true

    def show
      @counts = { "Users" => User.active.count, "Suspended users" => User.where(status: "suspended").count }
      @jobs = Admin::JobHealth.new
    end
  end
end

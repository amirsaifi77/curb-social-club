# Who may see and manage a club (clubs R-5, R-9, R-12). Manage is an
# `owner` or `admin` membership or a platform admin; the write endpoints
# it guards stay behind the `clubs_self_service` flag until Phase 7.
class ClubPolicy < ApplicationPolicy
  def show?
    return true unless record.hidden?

    manage?
  end

  def manage?
    return false unless member?
    return true if admin?

    ClubMembership.active.managers.exists?(club_id: record.id, user_id: user.id)
  end

  # clubs R-12: only the owner promotes to admin or transfers ownership.
  def owner?
    return false unless member?

    ClubMembership.active.exists?(club_id: record.id, user_id: user.id, role: "owner")
  end
end

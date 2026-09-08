# Who may see and manage a sponsor (sponsors R-5, R-11). Sponsor pages are
# admin-managed until `sponsors_self_service` turns on in Phase 7, when
# `sponsor_memberships` becomes the membership check.
class SponsorPolicy < ApplicationPolicy
  def show?
    return true unless record.hidden?

    manage?
  end

  def manage? = member? && admin?
end

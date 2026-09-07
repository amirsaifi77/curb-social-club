# Who may see and change one event (events-and-occurrences.md R-22, R-24;
# clubs.md R-13). "Host" is the user host, an owner or admin of the hosting
# club, or a platform admin. Sponsor-hosted events are admin-only until
# sponsor self-service (Phase 7).
class EventPolicy < ApplicationPolicy
  # The page exists for the public while the event is published and not
  # cancelled or hidden. Dormant events keep their page (R-27); an unlisted
  # one also needs a valid share token, which the controller checks.
  def show?
    return true if edit?

    record.published? && !record.gone?
  end

  def edit?
    return false unless member?
    return true if admin?

    case record.host_type
    when "User" then record.host_id == user.id
    when "Club" then ClubMembership.active.managers.exists?(club_id: record.host_id, user_id: user.id)
    else false
    end
  end
  alias update? edit?

  # R-24: the host, a club manager, or an admin answers "Still happening?".
  def confirm? = edit?

  # Phase 2 submits the claim; the flag tells the client whether to offer it.
  def claim?
    member? && record.claimed_at.nil? && !edit?
  end

  def claim_status
    return nil unless member?

    ClaimRequest.pending.where(user_id: user.id, event_id: record.id).exists? ? "pending" : nil
  end
end

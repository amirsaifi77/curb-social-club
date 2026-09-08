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

  # clubs R-13: a club host needs an owner or admin membership. sponsors
  # R-10: a sponsor host waits for Phase 7, so it is not_enabled rather
  # than forbidden. Used by the Phase 2 POST /events and PATCH /events/:id.
  def host_allowed?(host)
    return false unless member?

    case host
    when User then host.id == user.id || admin?
    when Club then admin? || ClubMembership.active.managers.exists?(club_id: host.id, user_id: user.id)
    when Sponsor then false
    else false
    end
  end

  def sponsor_host_enabled? = Features.enabled?(:sponsors_self_service)

  # sponsors R-10: attaching sponsorships is admin-only at launch.
  def sponsorships_allowed? = member? && admin?

  def claim_status
    return nil unless member?

    ClaimRequest.pending.where(user_id: user.id, event_id: record.id).exists? ? "pending" : nil
  end
end

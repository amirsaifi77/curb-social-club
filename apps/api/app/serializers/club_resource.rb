# Club detail (docs/api.md): ClubSummary plus the page's own fields. The
# viewer block is false or null for anonymous viewers (clubs R-9); follows
# arrive in Phase 2, so `following` is always false for now.
class ClubResource < ClubSummaryResource
  UPCOMING_LIMIT = 3
  MEMBERS_PREVIEW = 8

  attribute(:description) { |club| club.description }
  attribute(:banner_url) { |club| MediaUrls.attachment(club.banner) }
  attribute(:links) { |club| club.links }
  attribute(:events_count) { |club| club.events_count }

  attribute :upcoming_events do |club|
    EventSummaryResource.new(Hosts::UpcomingEvents.for(club, limit: UPCOMING_LIMIT)).to_h
  end

  attribute :members_preview do |club|
    club.memberships.active.includes(user: :profile).order(:created_at).limit(MEMBERS_PREVIEW)
        .filter_map { |membership| membership.user.profile }
        .map { |profile| MiniProfileResource.new(profile).to_h }
  end

  attribute :viewer do |club|
    viewer = params[:viewer]
    membership = viewer && club.memberships.find_by(user_id: viewer.id)
    { following: false,
      membership: membership && { role: membership.role, status: membership.status },
      can_manage: ClubPolicy.new(viewer, club).manage? }
  end
end

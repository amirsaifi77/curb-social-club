# Profile (docs/api.md; profiles-and-follow R-7, R-8). Anonymous viewers
# get every viewer field false. Vehicles, posts, and follows arrive in
# Phase 2 and Phase 4, so their counts are zero until then.
class ProfileResource
  include Alba::Resource

  attributes :handle, :display_name, :bio, :home_label, :is_host, :links

  attribute :id, &:user_id
  attribute(:avatar_url) { nil }

  attribute :clubs do |profile|
    memberships = Clubs::Memberships.visible_for(profile.user_id)
    ClubSummaryResource.new(memberships.map(&:club),
                            params: { roles: Clubs::Memberships.roles(memberships) }).to_h
  end

  attribute :counts do |profile|
    { followers: profile.followers_count, following: profile.following_count,
      events_hosted: Event.published.where(host_type: "User", host_id: profile.user_id).count,
      vehicles: 0, posts: 0 }
  end

  attribute :viewer do |profile|
    { following: false, blocked: false, is_self: params[:viewer]&.id == profile.user_id, reported: false }
  end
end

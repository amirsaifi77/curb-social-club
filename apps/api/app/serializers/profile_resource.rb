# Profile shape from docs/api.md; clubs and most counts fill in with their
# Phase 1 and 2 specs.
class ProfileResource
  include Alba::Resource

  attributes :handle, :display_name, :bio, :home_label, :is_host, :links

  attribute :id, &:user_id
  attribute(:avatar_url) { nil }
  attribute(:clubs) { [] }

  attribute :counts do |profile|
    { followers: profile.followers_count, following: profile.following_count,
      events_hosted: 0, vehicles: 0, posts: 0 }
  end

  attribute :viewer do |profile|
    { following: false, blocked: false, is_self: params[:viewer]&.id == profile.user_id, reported: false }
  end
end

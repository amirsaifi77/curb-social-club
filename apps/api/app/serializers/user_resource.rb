# GET /me shape (R-13): { id, email, role, status, created_at, profile,
# identities: [{ provider, email }], notification_prefs }.
class UserResource
  include Alba::Resource

  attributes :id, :email, :role, :status, :created_at

  attribute :profile do |user|
    ProfileResource.new(user.profile, params: { viewer: user }).to_h
  end

  attribute :identities do |user|
    user.identities.order(:created_at).map { |i| { provider: i.provider, email: i.email } }
  end

  attribute(:notification_prefs) { |user| user.profile.notification_prefs }
  attribute(:unread_notifications_count) { 0 }
end

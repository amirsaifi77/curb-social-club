# ClubSummary (docs/api.md). `distance_m` is present only when the row came
# from a `near` query, which selects it in SQL.
class ClubSummaryResource
  include Alba::Resource

  attributes :id, :slug, :name, :verified, :home_label, :members_count, :followers_count, :join_policy

  attribute(:avatar_url) { |club| MediaUrls.attachment(club.avatar) }
  attribute(:distance_m) { |club| club.has_attribute?(:distance_m) ? club[:distance_m] : nil }
  # Set only where a membership is in hand (GET /users/:handle/clubs).
  attribute(:role) { |club| params[:roles]&.fetch(club.id, nil) }
end

# MiniProfile (docs/api.md): the smallest person shape, used in member
# previews, going lists, posts, and comments.
class MiniProfileResource
  include Alba::Resource

  attributes :handle, :display_name

  attribute(:id, &:user_id)
  attribute(:avatar_url) { nil }
end
